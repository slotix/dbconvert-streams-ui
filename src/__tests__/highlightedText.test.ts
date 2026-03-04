import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HighlightedText from '../components/common/HighlightedText.vue'

describe('HighlightedText', () => {
  it('highlights all query tokens', () => {
    const wrapper = mount(HighlightedText, {
      props: {
        text: 'Files-dbconvert-exports',
        query: 'file exports'
      }
    })

    const marks = wrapper.findAll('mark')
    expect(marks).toHaveLength(2)
    expect(marks[0].text().toLowerCase()).toBe('file')
    expect(marks[1].text().toLowerCase()).toBe('exports')
  })

  it('ignores duplicate tokens in query', () => {
    const wrapper = mount(HighlightedText, {
      props: {
        text: 'Data Explorer Exports',
        query: 'exports exports'
      }
    })

    const marks = wrapper.findAll('mark')
    expect(marks).toHaveLength(1)
    expect(marks[0].text().toLowerCase()).toBe('exports')
  })
})
