/**
 * Szczecin Commute Cost & Transit Calculator.
 * Calculates drive time, fuel consumption, and monthly commute cost between districts.
 */

import { haversineKm } from '@/lib/matching/engine';

export interface CommuteCostEstimate {
  distanceKm: number;
  driveTimeMinutes: number;
  transitTimeMinutes: number;
  dailyFuelCostPln: number;
  monthlyFuelCostPln: number;
  co2KgMonthly: number;
}

const DEFAULT_FUEL_PRICE_PER_LITER = 6.50; // PLN/L
const DEFAULT_CAR_CONSUMPTION_L100KM = 8.0; // 8L / 100km urban Szczecin drive

export function calculateCommuteCost(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number,
  options: { fuelPricePerLiter?: number; carConsumptionL100km?: number } = {}
): CommuteCostEstimate {
  const distanceKm = Math.round(haversineKm(fromLat, fromLon, toLat, toLon) * 10) / 10;
  
  // Real driving distance is ~1.3x straight-line distance in urban area
  const drivingDistanceKm = Math.round(distanceKm * 1.3 * 10) / 10;
  
  // Urban speed ~35 km/h peak hours in Szczecin
  const driveTimeMinutes = Math.max(3, Math.round((drivingDistanceKm / 35) * 60));
  
  // Public transport multiplier ~1.6x
  const transitTimeMinutes = Math.max(5, Math.round(driveTimeMinutes * 1.6));

  const fuelPrice = options.fuelPricePerLiter || DEFAULT_FUEL_PRICE_PER_LITER;
  const consumption = options.carConsumptionL100km || DEFAULT_CAR_CONSUMPTION_L100KM;

  // Round trip (there and back)
  const dailyKm = drivingDistanceKm * 2;
  const dailyFuelLiters = (dailyKm / 100) * consumption;
  const dailyFuelCostPln = Math.round(dailyFuelLiters * fuelPrice * 100) / 100;

  // Assuming 21 working days per month
  const monthlyFuelCostPln = Math.round(dailyFuelCostPln * 21);
  const co2KgMonthly = Math.round(dailyKm * 21 * 0.12); // ~120g CO2 per km

  return {
    distanceKm: drivingDistanceKm,
    driveTimeMinutes,
    transitTimeMinutes,
    dailyFuelCostPln,
    monthlyFuelCostPln,
    co2KgMonthly,
  };
}
