/* @flow */

import { remove } from 'shared/util'


// ref
export default {
  // 注册ref,就是拿到组件或者dom元素,放入到上下文中的vm.$ref中
  create (_: any, vnode: VNodeWithData) {
    registerRef(vnode)
  },
  // update,说白了就是新旧的ref不一样,就赋值替换掉
  update (oldVnode: VNodeWithData, vnode: VNodeWithData) {
    if (oldVnode.data.ref !== vnode.data.ref) {
      registerRef(oldVnode, true)
      registerRef(vnode)
    }
  },
  // 就是把上下文对应的ref设置为undefined
  destroy (vnode: VNodeWithData) {
    registerRef(vnode, true)
  }
}

// 注册ref
// 例如<div ref="abc"></div>
// 生成的vnode.data.ref 就有对应的string "abc"
export function registerRef (vnode: VNodeWithData, isRemoval: ?boolean) {
  const key = vnode.data.ref
  if (!key) return

    // 拿到context上下文,vm = vnode.context
    // ref如果绑定在自定义组件上,那么就是componentInstance
    // 如果绑定在内建标签上它就是一个vnode.elm
  const vm = vnode.context
  const ref = vnode.componentInstance || vnode.elm
  // 上下文上面拿到vm.$refs
  const refs = vm.$refs
  if (isRemoval) {
    // isRemoval 移除ref
    if (Array.isArray(refs[key])) {
      remove(refs[key], ref)
    } else if (refs[key] === ref) {
      refs[key] = undefined
    }
  } else {
    // 没有isRemoval属性
    // 好像也没有
    if (vnode.data.refInFor) {
      // 考虑到了ref在一个v-for指令中
      if (!Array.isArray(refs[key])) {
        refs[key] = [ref]
      } else if (refs[key].indexOf(ref) < 0) {
        // $flow-disable-line
        // 如果上下文的refs中没有当前这个ref就push进去
        refs[key].push(ref)
      }
    } else {
      // 如果存在就更行ref中对应的ref
      refs[key] = ref
    }
  }
}
