// Baut aus 2-4 Einzelfotos ein einziges Rasterbild (Collage), das dann wie
// ein normales Einzelfoto an den Foto-zu-3D-Provider geschickt wird (siehe
// main.rs create_sculpture). Grund: Tripo/Meshy sehen bei nur einer Ansicht
// verdeckte Koerperteile (z.B. Beine/Schwanz eines liegenden Tiers) nicht
// und "halluzinieren" dort - mehrere Blickwinkel in einem Bild geben dem
// Modell mehr tatsaechliche Information statt Rateverfahren, ohne eine
// eigene (teurere) Multiview-API-Variante zu brauchen.

use image::{DynamicImage, ImageBuffer, Rgba, imageops::overlay};

const TILE_SIZE: u32 = 768;

/// 1 Foto -> kein Grund fuer eine Collage, wird vom Aufrufer separat
/// behandelt. 2 Fotos -> nebeneinander (2x1). 3-4 Fotos -> 2x2-Raster,
/// bei 3 Fotos bleibt die vierte Kachel leer (weiss). Jedes Foto wird
/// proportional in seine Kachel eingepasst (kein Zuschneiden/Verzerren,
/// siehe `DynamicImage::resize`), zentriert auf weissem Grund.
pub fn build_collage(photos: &[Vec<u8>]) -> Result<Vec<u8>, String> {
    let images: Vec<DynamicImage> = photos
        .iter()
        .map(|bytes| image::load_from_memory(bytes).map_err(|e| format!("Foto konnte nicht gelesen werden: {e}")))
        .collect::<Result<_, _>>()?;

    let cols: u32 = if images.len() <= 2 { images.len() as u32 } else { 2 };
    let rows: u32 = (images.len() as u32).div_ceil(cols);

    let mut canvas: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(TILE_SIZE * cols, TILE_SIZE * rows, Rgba([255, 255, 255, 255]));

    for (i, img) in images.iter().enumerate() {
        let col = (i as u32) % cols;
        let row = (i as u32) / cols;
        let fitted = img.resize(TILE_SIZE, TILE_SIZE, image::imageops::FilterType::Lanczos3);
        let x_off = col * TILE_SIZE + (TILE_SIZE - fitted.width()) / 2;
        let y_off = row * TILE_SIZE + (TILE_SIZE - fitted.height()) / 2;
        overlay(&mut canvas, &fitted, x_off as i64, y_off as i64);
    }

    let mut out = Vec::new();
    DynamicImage::ImageRgba8(canvas)
        .write_to(&mut std::io::Cursor::new(&mut out), image::ImageFormat::Png)
        .map_err(|e| format!("Collage konnte nicht kodiert werden: {e}"))?;
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn solid(w: u32, h: u32, color: [u8; 3]) -> Vec<u8> {
        let img = ImageBuffer::from_pixel(w, h, Rgba([color[0], color[1], color[2], 255]));
        let mut out = Vec::new();
        DynamicImage::ImageRgba8(img)
            .write_to(&mut std::io::Cursor::new(&mut out), image::ImageFormat::Png)
            .unwrap();
        out
    }

    #[test]
    fn two_photos_yield_2x1_grid() {
        let photos = vec![solid(400, 300, [255, 0, 0]), solid(300, 400, [0, 255, 0])];
        let png = build_collage(&photos).unwrap();
        let img = image::load_from_memory(&png).unwrap();
        assert_eq!(img.width(), TILE_SIZE * 2);
        assert_eq!(img.height(), TILE_SIZE);
    }

    #[test]
    fn three_photos_yield_2x2_grid() {
        let photos = vec![
            solid(400, 300, [255, 0, 0]),
            solid(300, 400, [0, 255, 0]),
            solid(500, 500, [0, 0, 255]),
        ];
        let png = build_collage(&photos).unwrap();
        let img = image::load_from_memory(&png).unwrap();
        assert_eq!(img.width(), TILE_SIZE * 2);
        assert_eq!(img.height(), TILE_SIZE * 2);
    }
}
