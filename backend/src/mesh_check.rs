// Manifold-/Watertight-Pruefung fuer generierte GLB-Modelle. Tripos SUCCESS-
// Status allein garantiert kein schweissbares Mesh - live bestaetigt am
// 25.08.2026: ein Modell mit smart_low_poly meldete SUCCESS, war aber nicht
// wasserdicht (188 offene Kanten, 72 Non-Manifold-Kanten). Prueft daher
// serverseitig per Kanten-Adjazenz, bevor das Modell als brauchbar gilt.
//
// Wichtig: glTF-Exporter duplizieren Vertices an UV-Seams/harten Normalen -
// dieselbe geometrische Ecke landet dann auf mehreren Indizes. Reine
// Index-Kanten-Adjazenz wuerde dadurch massiv "offene" Kanten ueberzaehlen
// (live beobachtet: 3659 statt 188 "boundary edges" vor dem Verschweissen
// desselben Modells). Es wird deshalb zuerst nach gerundeter Position
// verschweisst, bevor die eigentliche Topologie geprueft wird.

use std::collections::HashMap;

#[derive(Debug, Clone, serde::Serialize)]
pub struct MeshReport {
    pub raw_vertex_count: usize,
    pub welded_vertex_count: usize,
    pub triangle_count: usize,
    pub boundary_edges: usize,
    pub non_manifold_edges: usize,
    pub duplicate_winding_edges: usize,
    pub degenerate_triangles: usize,
    pub is_watertight: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum MeshCheckError {
    #[error("GLB konnte nicht geparst werden: {0}")]
    Parse(String),
    #[error("Kein Mesh mit Positions-/Index-Daten im GLB gefunden")]
    NoMesh,
}

const WELD_EPSILON: f32 = 1e-5;

pub fn check_glb(bytes: &[u8]) -> Result<MeshReport, MeshCheckError> {
    let (document, buffers, _images) =
        gltf::import_slice(bytes).map_err(|e| MeshCheckError::Parse(e.to_string()))?;

    let mesh = document.meshes().next().ok_or(MeshCheckError::NoMesh)?;
    let primitive = mesh.primitives().next().ok_or(MeshCheckError::NoMesh)?;
    let reader = primitive.reader(|buffer| buffers.get(buffer.index()).map(|d| d.0.as_slice()));

    let positions: Vec<[f32; 3]> = reader
        .read_positions()
        .ok_or(MeshCheckError::NoMesh)?
        .collect();
    let raw_indices: Vec<u32> = match reader.read_indices() {
        Some(it) => it.into_u32().collect(),
        None => (0..positions.len() as u32).collect(), // non-indexed: jedes Dreieck steht fuer sich
    };

    // Nach gerundeter Position verschweissen, um Export-Duplikate an
    // UV-Seams/harten Normalen aufzuloesen (siehe Datei-Kommentar oben).
    let mut pos_key_to_welded: HashMap<(i64, i64, i64), u32> = HashMap::new();
    let mut welded_of: Vec<u32> = Vec::with_capacity(positions.len());
    for p in &positions {
        let key = (
            (p[0] / WELD_EPSILON).round() as i64,
            (p[1] / WELD_EPSILON).round() as i64,
            (p[2] / WELD_EPSILON).round() as i64,
        );
        let next_id = pos_key_to_welded.len() as u32;
        let id = *pos_key_to_welded.entry(key).or_insert(next_id);
        welded_of.push(id);
    }
    let welded_vertex_count = pos_key_to_welded.len();

    let indices: Vec<u32> = raw_indices.iter().map(|&i| welded_of[i as usize]).collect();
    let triangle_count = indices.len() / 3;

    let mut directed: HashMap<(u32, u32), u32> = HashMap::new();
    let mut undirected: HashMap<(u32, u32), u32> = HashMap::new();
    let mut degenerate_triangles = 0usize;

    for t in 0..triangle_count {
        let a = indices[t * 3];
        let b = indices[t * 3 + 1];
        let c = indices[t * 3 + 2];
        if a == b || b == c || c == a {
            degenerate_triangles += 1;
        }
        for &(x, y) in &[(a, b), (b, c), (c, a)] {
            *directed.entry((x, y)).or_insert(0) += 1;
            let ukey = if x < y { (x, y) } else { (y, x) };
            *undirected.entry(ukey).or_insert(0) += 1;
        }
    }

    let mut boundary_edges = 0usize;
    let mut non_manifold_edges = 0usize;
    for &count in undirected.values() {
        if count == 1 {
            boundary_edges += 1;
        } else if count > 2 {
            non_manifold_edges += 1;
        }
    }
    let duplicate_winding_edges = directed.values().filter(|&&c| c > 1).count();

    let is_watertight = boundary_edges == 0 && non_manifold_edges == 0 && degenerate_triangles == 0;

    Ok(MeshReport {
        raw_vertex_count: positions.len(),
        welded_vertex_count,
        triangle_count,
        boundary_edges,
        non_manifold_edges,
        duplicate_winding_edges,
        degenerate_triangles,
        is_watertight,
    })
}
