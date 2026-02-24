import { computed, type Ref } from 'vue'
import type { StreamConfig } from '@/types/streamConfig'
import type { Evaluation } from '@/types/user'
import { formatDataSize, formatElapsedTimeWithUnit } from '@/utils/formats'

interface EvaluationWarningLike {
  streamId: string
  mode: 'convert' | 'cdc'
  threshold: number
  percent: number
  used: number
  limit: number
  message: string
  updatedAt: number
}

interface UseStreamEvaluationBannerOptions {
  stream: Ref<StreamConfig>
  isStreamRunning: Ref<boolean>
  streamID: Ref<string>
  liveWarning: Ref<EvaluationWarningLike | null>
  subscriptionStatus: Ref<string | undefined>
  evaluation: Ref<Evaluation | undefined>
}

function formatDurationSeconds(seconds: number) {
  const formatted = formatElapsedTimeWithUnit(seconds * 1e9)
  return `${formatted.value}${formatted.unit}`
}

export function useStreamEvaluationBanner(options: UseStreamEvaluationBannerOptions) {
  const evaluationBanner = computed<EvaluationWarningLike | null>(() => {
    const mode = options.stream.value.mode
    const currentSubscriptionStatus = (options.subscriptionStatus.value || '').toLowerCase()
    if (currentSubscriptionStatus === 'active') {
      return null
    }

    const streamID = options.streamID.value
    const warning = options.liveWarning.value

    if (
      options.isStreamRunning.value &&
      warning &&
      warning.streamId === streamID &&
      warning.mode === mode &&
      warning.threshold >= 90
    ) {
      return warning
    }

    const evaluation = options.evaluation.value
    if (!evaluation) {
      return null
    }

    const warnedPercent =
      mode === 'convert'
        ? evaluation.convert_warned_percent || 0
        : evaluation.cdc_warned_percent || 0
    if (warnedPercent < 90) {
      return null
    }

    const used = mode === 'convert' ? evaluation.convert_bytes : evaluation.cdc_seconds
    const limit = mode === 'convert' ? evaluation.convert_limit_bytes : evaluation.cdc_limit_seconds
    if (!limit) {
      return null
    }

    const percent = Math.min(100, Math.floor((used / limit) * 100))
    return {
      streamId: streamID,
      mode,
      threshold: warnedPercent,
      percent,
      used,
      limit,
      message: '',
      updatedAt: Date.now()
    }
  })

  const evaluationBannerTitle = computed(() => {
    if (!evaluationBanner.value) return ''
    return evaluationBanner.value.percent >= 100
      ? 'Evaluation limit reached'
      : 'Evaluation limit almost reached'
  })

  const evaluationBannerBody = computed(() => {
    const warning = evaluationBanner.value
    if (!warning) return ''

    const modeLabel = warning.mode === 'convert' ? 'Convert usage' : 'CDC runtime'
    const usedLabel =
      warning.mode === 'convert'
        ? formatDataSize(warning.used)
        : formatDurationSeconds(warning.used)
    const limitLabel =
      warning.mode === 'convert'
        ? formatDataSize(warning.limit)
        : formatDurationSeconds(warning.limit)
    const percent = warning.percent || warning.threshold
    const suffix =
      percent >= 100
        ? 'New streams will not start until you subscribe.'
        : 'Subscribe soon to continue without interruption.'
    return `${modeLabel} at ${percent}% (${usedLabel} of ${limitLabel}). ${suffix}`
  })

  return {
    evaluationBanner,
    evaluationBannerTitle,
    evaluationBannerBody
  }
}
