export interface SelectValueOption {
  type?: 'option'
  value: string | number
  label: string
  selectedLabel?: string
  disabled?: boolean
  icon?: string
  indented?: boolean
}

export interface SelectHeaderOption {
  type: 'header'
  label: string
}

export interface SelectDividerOption {
  type: 'divider'
}

export type SelectOption = SelectValueOption | SelectHeaderOption | SelectDividerOption
