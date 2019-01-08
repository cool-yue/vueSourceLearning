/* @flow */

import {
  isDef,
  isUndef
} from 'shared/util'

import {
  concat,
  stringifyClass,
  genClassForVnode
} from 'web/util/index'

// 首先看看class的compile过程
// "<div :class='{abc:abc}' class='aaa' ></div>"
// with(this){return _c('div',{staticClass:"aaa",class:{abc:abc}})}

// "<my-div :class='[abc,{bbb:ccc}]' class='aaa' ></my-div>"
// with(this){return _c('my-div',{staticClass:"aaa",class:[abc,{bbb:ccc}]})}

// 处理dom层级的Class
// create和update都是这个方法
// 这里主要是genClassForVnode做了什么?

// class虽然合并了很多,但是一定会有很多重复的比如"aaa aaa aaa aaa bbb"
// 最后实际上生效的只有2个aaa和bbb
// classList.length = 2;
function updateClass (oldVnode: any, vnode: any) {
  const el = vnode.elm
  const data: VNodeData = vnode.data
  const oldData: VNodeData = oldVnode.data
  if (
    isUndef(data.staticClass) &&
    isUndef(data.class) && (
      isUndef(oldData) || (
        isUndef(oldData.staticClass) &&
        isUndef(oldData.class)
      )
    )
  ) {
    return
  }

  // genClassForVnode接受一个新的vnode
  // cls是一个合并了静态class和动态class类和祖先的class的字符串
  let cls = genClassForVnode(vnode)

  // handle transition classes
  // tansition的class会专门放入到vnode的data的transition中,它是个对象
  // 从el总拿到_transitionClasses然后也合并到cls中
  const transitionClass = el._transitionClasses
  if (isDef(transitionClass)) {
    cls = concat(cls, stringifyClass(transitionClass))
  }

  // set the class
  if (cls !== el._prevClass) {
    // 这里还做个优化,尽量少动dom
    // 如果cls跟上一次一样,就不管
    // 如果不一样,才会设置class
    // 然后把当前的cls设置为el._prevClass
    el.setAttribute('class', cls)
    el._prevClass = cls
  }
}

export default {
  create: updateClass,
  update: updateClass
}
