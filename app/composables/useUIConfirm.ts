import { reactive } from 'vue'

interface ConfirmOptions {
  header?: string
  message: string
  acceptLabel?: string
  rejectLabel?: string
  icon?: any
  accept?: () => void
  reject?: () => void
  severity?: 'primary' | 'danger'
}

interface ConfirmState {
  visible: boolean
  options: ConfirmOptions | null
}

const state = reactive<ConfirmState>({
  visible: false,
  options: null
})

export const useUIConfirm = () => {
  const require = (options: ConfirmOptions) => {
    state.options = {
      acceptLabel: 'Confirm',
      rejectLabel: 'Cancel',
      severity: 'primary',
      ...options
    }
    state.visible = true
  }

  const accept = () => {
    if (state.options?.accept) {
      state.options.accept()
    }
    state.visible = false
  }

  const reject = () => {
    if (state.options?.reject) {
      state.options.reject()
    }
    state.visible = false
  }

  const close = () => {
    state.visible = false
  }

  return {
    state,
    require,
    accept,
    reject,
    close
  }
}
