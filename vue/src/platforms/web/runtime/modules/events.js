/* @flow */

import { isDef, isUndef } from 'shared/util'
import { updateListeners } from 'core/vdom/helpers/index'
import { isChrome, isIE, supportsPassive } from 'core/util/env'
import { RANGE_TOKEN, CHECKBOX_RADIO_TOKEN } from 'web/compiler/directives/model'

// normalize v-model event tokens that can only be determined at runtime.
// it's important to place the event as the first in the array because
// the whole point is ensuring the v-model callback gets called before
// user-attached handlers.
// 这里主要是处理解析模板不足以实现的功能
// 因为v-model有一些特殊情况
// 比如<input type="range" v-model="abc" />
// compile之后它变成了
//  with(this){
//  return _c('input',{
//             directives:[{name:"model",rawName:"v-model",value:(aaa),expression:"aaa"}],
//             attrs:{"type":"range"},
//             domProps:{"value":(aaa)},
//             on:{"__r":function($event){aaa=$event.target.value}}})}
// 因为在解析template的时候,是纯粹的字符串解析,在那种上下文环境中,并不能判断是在IE还是在别的浏览器
// 但是有些边界情况又要考虑到IE和非IE,针对model的一般情况是针对input事件,有些个情况不支持,于是就给
// 个字段__r,通过运行时来判断,再给出正确的事件名称
// 对于通常情况来说<input type='text' v-model='aaa' />
// compile之后就变成了
// with(this){
//    return _c('input',{
//               directives:[{name:"model",rawName:"v-model",value:(aaa),expression:"aaa"}],
//               attrs:{"type":"text"},domProps:{"value":(aaa)},
//               on:{"input":function($event){if($event.target.composing)return;aaa=$event.target.value}}})}
// 由于type=text,各个浏览器行为一致,因此对于input这个事件无需做不同浏览器的边缘情况考虑
function normalizeEvents (on) {
  let event
  /* istanbul ignore if */
  if (isDef(on[RANGE_TOKEN])) {
    // IE input[type=range] only supports `change` event
    event = isIE ? 'change' : 'input'
    on[event] = [].concat(on[RANGE_TOKEN], on[event] || [])
    delete on[RANGE_TOKEN]
  }
  // select在chrome中,v-model应该绑定click事件
  // 在其余的浏览器中绑定change事件
  // 下面的情况也一样
  if (isDef(on[CHECKBOX_RADIO_TOKEN])) {
    // Chrome fires microtasks in between click/change, leads to #4521
    event = isChrome ? 'click' : 'change'
    on[event] = [].concat(on[CHECKBOX_RADIO_TOKEN], on[event] || [])
    delete on[CHECKBOX_RADIO_TOKEN]
  }
}

let target: HTMLElement

// add变成了addEventListener,区别于自定义事件
function add (
  event: string,
  handler: Function,
  once: boolean,
  capture: boolean,
  passive: boolean
) {
  if (once) {
    const oldHandler = handler
    const _target = target // save current target element in closure
    handler = function (ev) {
      const res = arguments.length === 1
        ? oldHandler(ev)
        : oldHandler.apply(null, arguments)
      if (res !== null) {
        remove(event, handler, capture, _target)
      }
    }
  }
  target.addEventListener(
    event,
    handler,
    supportsPassive
      ? { capture, passive }
      : capture
  )
}
// remove变成了removeEventListener,区别于自定义事件
function remove (
  event: string,
  handler: Function,
  capture: boolean,
  _target?: HTMLElement
) {
  (_target || target).removeEventListener(event, handler, capture)
}

// 渲染dom事件的时候
// oldVnode设置为emptyNode
function updateDOMListeners (oldVnode: VNodeWithData, vnode: VNodeWithData) {
  if (isUndef(oldVnode.data.on) && isUndef(vnode.data.on)) {
    return
  }
  const on = vnode.data.on || {}
  const oldOn = oldVnode.data.on || {}
  target = vnode.elm
  normalizeEvents(on)
  updateListeners(on, oldOn, add, remove, vnode.context)
}

export default {
  create: updateDOMListeners,
  update: updateDOMListeners
}
