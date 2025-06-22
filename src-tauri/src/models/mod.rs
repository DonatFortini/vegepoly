use geo::Point;
use serde::Serialize;

pub mod processing;
pub mod settings;
pub mod vegetations;

#[derive(Serialize)]
pub struct PolygonData {
    pub polygon: Vec<Point>,
    pub points: Vec<Point>,
}
