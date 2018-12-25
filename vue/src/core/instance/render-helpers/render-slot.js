/* @flow */

import { extend, warn } from 'core/util/index'

/**
 * Runtime helper for rendering <slot>
 */

/**
 * template = `"<div class='aaa':class='bbb' id='mmmm' ref='dddd'>
      <p>{{mes}}</p>
      <div>abc</div>
      <bb></bb>
      <slot></slot>
    </div>"`;
 *
 */

 // 上面的模板会转化成下面的render
 // 其中renderSlot === _t

/**
 * code:
    "_c('div',{ref:"dddd",staticClass:"aaa",class:bbb,attrs:{"id":"mmmm"}},
    [_c('p',[_v(_s(mes))]),
     _c('div',[_v("abc")]),
     _c('bb'),
     _t("default")],
     2)"
 */


export function renderSlot (
  name: string,
  fallback: ?Array<VNode>,
  props: ?Object,
  bindObject: ?Object
): ?Array<VNode> {
  // renderSlot返回一个VNode的数组,此时this指向vm
  // 先去取vm.$scopedSlots[name],name为slot的名字,默认情况叫default
  const scopedSlotFn = this.$scopedSlots[name]
  // 如果$scopedSlots存在的话,
  // props有值就用,没值就初始化一个{}
  // bindObject并入一个对象,再把props并入这个对象最后给props
  // 这里的props是什么?
  // 比如<slot :data=data></slot>,那么props为{data:data}
  // 最后执行scopedSlotFn并把这个props传进去
  // 如果前面执行返回了false就悬着返回fallback
  // fallback是一个VNode数组
  // fallback是什么,如果<slot><div>abc</div></slot>
  // 那么fallbakc = [_c("div",[_v("abc")])]
  // 也就是说,如果父组件啥也没传,那么slot的输出会找这默认的fallback
  // <slot></slot>是这样的
  // 那么fallbakc字段会生成为null
  // 最后<slot></slot>就什么也没渲染是一个空的[],$slots{default:[]}
  if (scopedSlotFn) { // scoped slot
    props = props || {}
    if (bindObject) {
      props = extend(extend({}, bindObject), props)
    }
    return scopedSlotFn(props) || fallback
  } else {
    // 如果没有scopedSlot,就取得vm.$slots[name]
    // 得到了slot的Vnode
    // 将拿到的slot上面给个属性_rendered = true
    // 最后返回vm.$slots[name]
    const slotNodes = this.$slots[name]
    // warn duplicate slot usage
    if (slotNodes && process.env.NODE_ENV !== 'production') {
      slotNodes._rendered && warn(
        `Duplicate presence of slot "${name}" found in the same render tree ` +
        `- this will likely cause render errors.`,
        this
      )
      slotNodes._rendered = true
    }
    return slotNodes || fallback
  }
}
