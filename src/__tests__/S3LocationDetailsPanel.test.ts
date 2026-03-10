import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import S3LocationDetailsPanel from '@/components/database/S3LocationDetailsPanel.vue'

vi.mock('@/components/database/S3ManifestManagerPanel.vue', () => ({
  default: {
    name: 'S3ManifestManagerPanel',
    props: ['connectionId', 'directoryPath', 'selectedPath', 'fileEntries'],
    template:
      '<div data-test="manifest-panel">{{ connectionId }}|{{ directoryPath }}|{{ selectedPath }}|{{ fileEntries?.length || 0 }}</div>'
  }
}))

describe('S3LocationDetailsPanel', () => {
  it('shows bucket-scoped info and passes selected location context to the manifest panel', () => {
    const wrapper = mount(S3LocationDetailsPanel, {
      props: {
        connectionId: 'conn-s3',
        locationPath: 's3://bucket/orders/',
        directoryRootPath: 's3://',
        rootEntries: [
          {
            name: 'bucket',
            path: 's3://bucket',
            type: 'dir',
            children: [
              {
                name: 'orders',
                path: 's3://bucket/orders/',
                type: 'dir',
                children: [
                  {
                    name: 'orders-manifest.json',
                    path: 's3://bucket/orders/orders-manifest.json',
                    type: 'file'
                  },
                  {
                    name: 'orders-0001.parquet',
                    path: 's3://bucket/orders/orders-0001.parquet',
                    type: 'file'
                  },
                  {
                    name: 'archive',
                    path: 's3://bucket/orders/archive/',
                    type: 'dir'
                  }
                ]
              }
            ]
          }
        ]
      }
    })

    expect(wrapper.text()).toContain('bucket')
    expect(wrapper.text()).toContain('orders')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('1 manifests, 1 folders')
    expect(wrapper.get('[data-test="manifest-panel"]').text()).toContain(
      'conn-s3|s3://|s3://bucket/orders/|1'
    )
  })
})
