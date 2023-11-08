import { LivenessApiResponse } from '@l2beat/shared-pure'
import { groupBy, mapValues } from 'lodash'

import {
  LivenessRecord,
  LivenessRepository,
} from '../../../peripherals/database/LivenessRepository'
import { groupByAndOmit } from '../utils/grouping'
import { calculateAnomalies } from './calculateAnomalies'
import { calculateIntervalWithAverages } from './calculateIntervalWithAverages'

export class LivenessController {
  constructor(private readonly livenessRepository: LivenessRepository) {}

  async getLiveness(): Promise<LivenessApiResponse> {
    const allRecords = await this.livenessRepository.getAll()
    const groupedByProjectAndType = groupByProjectIdAndType(allRecords)

    const intervals = calculateIntervalWithAverages(groupedByProjectAndType)
    const withAnomalies = calculateAnomalies(intervals)

    return LivenessApiResponse.parse({ projects: withAnomalies })
  }
}

export function groupByProjectIdAndType(allRecords: LivenessRecord[]) {
  return mapValues(
    mapValues(groupByAndOmit(allRecords, 'projectId'), (firstGroupingResult) =>
      groupBy(firstGroupingResult, (item) => item.type),
    ),
    (
      value: Record<string, Omit<LivenessRecord, 'projectId'>[] | undefined>,
    ) => {
      return {
        batchSubmissions: {
          records:
            value.DA?.sort(
              (a, b) => b.timestamp.toNumber() - a.timestamp.toNumber(),
            ) ?? [],
        },
        stateUpdates: {
          records:
            value.STATE?.sort(
              (a, b) => b.timestamp.toNumber() - a.timestamp.toNumber(),
            ) ?? [],
        },
      }
    },
  )
}
