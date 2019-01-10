/* @flow */

import { isDef } from 'shared/util'

// 拿到第一个子组件
// 如何判断子组件,就是看是否拥有componentOptions选项
export function getFirstComponentChild (children: ?Array<VNode>): ?VNode {
  if (Array.isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      const c = children[i]
      if (isDef(c) && isDef(c.componentOptions)) {
        return c
      }
    }
  }
}
