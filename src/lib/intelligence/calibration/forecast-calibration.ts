import { DriftReport } from './prediction-drift'

/**
 * Forecast Calibration Engine
 * Refines the system's "Epistemic Certainty" based on historical drift.
 */
export class ForecastCalibration {
  /**
   * Calibrates a raw forecast probability using historical drift data.
   */
  static calibrate(rawProbability: number, drift: DriftReport): {
    calibratedProbability: number
    confidence: number
  } {
    // Apply drift correction: if we historically under-predict, boost the probability
    let calibrated = rawProbability + (drift.meanDrift * 0.5) // Conservative correction
    calibrated = Math.max(0.05, Math.min(0.95, calibrated))

    return {
      calibratedProbability: calibrated,
      confidence: drift.reliability
    }
  }

  /**
   * Determines if the current forecast is "Epistemically Unstable"
   */
  static isUnstable(drift: DriftReport): boolean {
    return Math.abs(drift.meanDrift) > 0.3 && drift.sampleSize > 10
  }
}
