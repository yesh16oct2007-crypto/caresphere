import { Request, Response } from 'express';
import { db } from '../db/database.js';

// 1. Get Hospitals with Indoor Map Coverage
export function getNavigationHospitals(req: Request, res: Response): void {
  try {
    const hospitals = db.prepare(`
      SELECT h.id, h.name, h.location, h.city, h.emergency_hotline,
             (SELECT COUNT(*) FROM hospital_floor_maps WHERE hospital_id = h.id) as floor_count,
             (SELECT COUNT(*) FROM hospital_locations WHERE hospital_id = h.id) as mapped_locations_count
      FROM hospitals h
      WHERE h.is_active = 1
      ORDER BY floor_count DESC, h.name ASC
    `).all();

    res.json({ hospitals });
  } catch (err: any) {
    console.error('Get nav hospitals error:', err);
    res.status(500).json({ error: 'Failed to retrieve navigation hospitals.' });
  }
}

// 2. Get Hospital Multi-Floor Maps and Locations
export function getHospitalFloorData(req: Request, res: Response): void {
  try {
    const hospitalId = Number(req.params.hospitalId);

    const hospital = db.prepare('SELECT id, name, location, city, emergency_hotline FROM hospitals WHERE id = ?').get(hospitalId) as any;
    if (!hospital) {
      res.status(404).json({ error: 'Hospital not found.' });
      return;
    }

    const floors = db.prepare(`
      SELECT id, floor_number, floor_name, svg_layout_data
      FROM hospital_floor_maps
      WHERE hospital_id = ? AND is_active = 1
      ORDER BY floor_number ASC
    `).all(hospitalId) as any[];

    const locations = db.prepare(`
      SELECT hl.*, hfm.floor_number, hfm.floor_name
      FROM hospital_locations hl
      JOIN hospital_floor_maps hfm ON hl.floor_id = hfm.id
      WHERE hl.hospital_id = ?
      ORDER BY hfm.floor_number ASC, hl.name ASC
    `).all(hospitalId) as any[];

    const mappedLocations = locations.map(l => ({
      ...l,
      coordinates: l.coordinates_json ? JSON.parse(l.coordinates_json) : null
    }));

    res.json({
      hospital,
      floors: floors.map(f => ({
        ...f,
        layout: f.svg_layout_data ? JSON.parse(f.svg_layout_data) : null
      })),
      locations: mappedLocations,
      entrances: mappedLocations.filter(l => l.category === 'reception' || l.category === 'emergency')
    });
  } catch (err: any) {
    console.error('Get floor data error:', err);
    res.status(500).json({ error: 'Failed to retrieve indoor floor map.' });
  }
}

// 3. Compute Turn-by-Turn Route
export function computeIndoorRoute(req: Request, res: Response): void {
  try {
    const { hospital_id, from_id, to_id, wheelchair_accessible = 'true' } = req.query;

    if (!hospital_id || !to_id) {
      res.status(400).json({ error: 'hospital_id and to_id are required.' });
      return;
    }

    const destination = db.prepare(`
      SELECT hl.*, hfm.floor_number, hfm.floor_name
      FROM hospital_locations hl
      JOIN hospital_floor_maps hfm ON hl.floor_id = hfm.id
      WHERE hl.id = ? AND hl.hospital_id = ?
    `).get(Number(to_id), Number(hospital_id)) as any;

    if (!destination) {
      res.status(404).json({ error: 'Destination location not found in hospital map.' });
      return;
    }

    let origin: any = null;
    if (from_id) {
      origin = db.prepare(`
        SELECT hl.*, hfm.floor_number, hfm.floor_name
        FROM hospital_locations hl
        JOIN hospital_floor_maps hfm ON hl.floor_id = hfm.id
        WHERE hl.id = ? AND hl.hospital_id = ?
      `).get(Number(from_id), Number(hospital_id)) as any;
    } else {
      // Default to Main Entrance
      origin = db.prepare(`
        SELECT hl.*, hfm.floor_number, hfm.floor_name
        FROM hospital_locations hl
        JOIN hospital_floor_maps hfm ON hl.floor_id = hfm.id
        WHERE hl.hospital_id = ? AND hl.category = 'reception'
        ORDER BY hl.id ASC LIMIT 1
      `).get(Number(hospital_id)) as any;
    }

    const isWheelchair = wheelchair_accessible === 'true';
    const sameFloor = origin && origin.floor_number === destination.floor_number;

    const steps: string[] = [];
    if (origin) {
      steps.push(`Start at ${origin.name} (${origin.floor_name}).`);
    } else {
      steps.push('Start at Main Hospital Entrance (Ground Floor Atrium).');
    }

    if (!sameFloor && origin) {
      if (isWheelchair) {
        steps.push(`Proceed down the central corridor toward Elevator Bank A (marked Wheelchair Accessible).`);
        steps.push(`Take Elevator Bank A up to ${destination.floor_name} (Floor ${destination.floor_number}).`);
      } else {
        steps.push(`Proceed to Stairwell B or Elevator Bank A.`);
        steps.push(`Go to ${destination.floor_name} (Floor ${destination.floor_number}).`);
      }
    }

    if (destination.wing) {
      steps.push(`Follow the ceiling wayfinding signage toward ${destination.wing}.`);
    }

    if (destination.directions_text) {
      steps.push(destination.directions_text);
    } else {
      steps.push(`Walk past the Nursing Station; ${destination.name} (${destination.room_number || ''}) will be clearly marked.`);
    }

    steps.push(`You have arrived at ${destination.name}.`);

    res.json({
      origin: origin ? { id: origin.id, name: origin.name, floor: origin.floor_name } : null,
      destination: {
        id: destination.id,
        name: destination.name,
        room_number: destination.room_number,
        floor_number: destination.floor_number,
        floor_name: destination.floor_name,
        wing: destination.wing,
        category: destination.category
      },
      is_wheelchair_accessible: isWheelchair,
      estimated_time_minutes: sameFloor ? 2 : 4,
      total_steps: steps.length,
      directions: steps
    });
  } catch (err: any) {
    console.error('Compute route error:', err);
    res.status(500).json({ error: 'Failed to compute indoor route.' });
  }
}
