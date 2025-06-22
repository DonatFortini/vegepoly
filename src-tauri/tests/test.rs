#[cfg(test)]
mod tests {
    use vegepoly_lib::sampling::fill_polygon;

    use vegepoly_lib::utils::parse_csv_file;

    #[test]
    fn test_fill_polygon() {
        let polygons =
            parse_csv_file("tests/VEGETATION_ARBRES.csv").expect("Failed to parse CSV file");
        println!("Parsed {} polygons from CSV file", polygons.len());
        println!("First polygon: {:?}", polygons[0]);

        let params = vegepoly_lib::models::vegetations::VegetationParams {
            vegetation_type: 1,
            density: 28.0,
            type_value: 10,
        };

        let result = fill_polygon(polygons[0].clone(), params)
            .expect("Failed to fill polygon with vegetation points");
        println!("Generated {} points for the first polygon", result.len());

        println!("{:?}", result);
    }
}
