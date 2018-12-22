/* @flow */

import config from '../config'
import VNode, { createEmptyVNode } from './vnode'
import { createComponent } from './create-component'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isPrimitive,
  resolveAsset
} from '../util/index'

import {
  normalizeChildren,
  simpleNormalizeChildren
} from './helpers/index'

const SIMPLE_NORMALIZE = 1
const ALWAYS_NORMALIZE = 2

// wrapper function for providing a more flexible interface
// without getting yelled at by flow

// 包装一下_createElement让这个creatElement更灵活
// 比如createElement("div",[vnode,vnode]);
// 函数要求是 tag是标签名
// data是Vnode属性
// children是一个装有vnode的数组
// 但是如果我没有data的话,难道调用createElment('div',null,[])?????
// 因此为了更灵活,所以createElement('div',[Vnode,Vnode]);
// 它会把判断第二个参数,如果是数组或者是原始类型,例如是字符串的的话就认为它是children
// 因为data必须是个对象,而children必须是数组或者字符串
// 实际上是_createElement在做事
export function createElement (
  context: Component,
  tag: any,
  data: any,
  children: any,
  normalizationType: any,
  alwaysNormalize: boolean
): VNode {
  if (Array.isArray(data) || isPrimitive(data)) {
    normalizationType = children
    children = data
    data = undefined
  }
  if (isTrue(alwaysNormalize)) {
    normalizationType = ALWAYS_NORMALIZE
  }
  return _createElement(context, tag, data, children, normalizationType)
}

// 返回一个VNode
export function _createElement (
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode {
  if (isDef(data) && isDef((data: any).__ob__)) {
    process.env.NODE_ENV !== 'production' && warn(
      `Avoid using observed data object as vnode data: ${JSON.stringify(data)}\n` +
      'Always create fresh vnode data objects in each render!',
      context
    )
    return createEmptyVNode()
  }
  // object syntax in v-bind
  // 这里的操作就服从html的约束,例如在tr里面td才有效,但是td现在是个组件叫<my-td>
  // 那么正常情况下,应该使用is,把该组件的html最外层渲染成为td
  // 例如<my-td :is=xxx></my-td>
  if (isDef(data) && isDef(data.is)) {
    tag = data.is
  }
  // 如果没有tag标签,那么就返回一个空的Vnode
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode()
  }
  // warn against non-primitive key
  // 要求key的值是原始值
  // 因为在diff运算的时候,做高效的复用而不是直接创建新的节点的时候
  // 会将这个key值作为一个键去取对应的Vnode和Vnode.elm,那么key如果是个对象或者数组的话
  // 虽然map原则上是可以,但是这样把事情搞复杂了
  if (process.env.NODE_ENV !== 'production' &&
    isDef(data) && isDef(data.key) && !isPrimitive(data.key)
  ) {
    warn(
      'Avoid using non-primitive value as key, ' +
      'use string/number value instead.',
      context
    )
  }
  // support single function children as default scoped slot
  // children是不是数组,如果是数组,并且第一个元素是函数
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    // 那么就先拿到data,然后在data上面赋一个属性scopedSlots
    // 把default:children[0]
    // 然后children的长度变为0,也就是清空数组
    // children里面为什么会传入函数,这个后面再讨论
    data = data || {}
    data.scopedSlots = { default: children[0] }
    children.length = 0
  }
  /*
      ALWAYS_NORMALIZE === 2
      SIMPLE_NORMALIZE === 1
      以下2个方法,把children标准化,细节后面再说
  */
  if (normalizationType === ALWAYS_NORMALIZE) {
    children = normalizeChildren(children)
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    children = simpleNormalizeChildren(children)
  }
  // 创建vnode属性和ns属性
  let vnode, ns
  if (typeof tag === 'string') {
    let Ctor
    // getTagNamespace目前在utils中是个noop函数,也就是说是个空函数
    // 至于后期有没有重新初始化,后面再看
    ns = config.getTagNamespace(tag)
    // 判断tag是不是保留标签
    /*
    'template,script,style,element,content,slot,link,meta,svg,view,' +
    'a,div,img,image,text,span,richtext,input,switch,textarea,spinner,select,' +
    'slider,slider-neighbor,indicator,trisition,trisition-group,canvas,' +
    'list,cell,header,loading,loading-indicator,refresh,scrollable,scroller,' +
    'video,web,embed,tabbar,tabheader,datepicker,timepicker,marquee,countdown',
    */
    if (config.isReservedTag(tag)) {
      // platform built-in elements
      // 如果是保留标签，及平台内建标签,那么就parsePlatformTagName,这个方法做了什么后面再看
      // vnode是内建的标签,所以这里就直接new Vnode了不需要别的
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      )
    } else if (isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // resolveAsset这里会在context的上下文中找components属性
      // 例如<abc></abc>被解析成了Vnode{tag:'abc'}
      // conponents:{abc},那么当当前上下文中如果有contents.$options.components[abc]
      // 这个components属性中的abc为组件的一个options选项
      // 所以如果Ctor找到了,那么Ctor会是一个import进来的组件的options选项
      // 因此这里这里继续调用CreateCompoent过程后面有说
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      // 这程序跑到这里来,表示这个tag虽然是字符串,但是context上下文中的components并没有
      // 这个组件名称,同时又不是内建标签
      // 那么还是创建一个Vnode
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else {
    // direct component options / constructor
    // tag除了取标签字符串值以外,还能取一个组件的options选项属性
    // tag是选项属性那么继续调动createComponent
    // 这个方法返回一个Vnode
    // createElement最终返回的Vnode实际上是由这个createComponent创建
    // 由于这里tag是options,因此会调用Vue.extend(tag),创建一个实例构造器
    // 这个实例构造器没啥别的用,就是放入以后的componentOptions里面
    // 由于children本身传入的是vode
    // 如果是数组又不是vnode,那么会当成ScopeSlot来处理,
    // 所以createComponent基本上就整合了下data里面的属性
    // 把data.on放在一个listener属性中,在data中并入hook
    // 把data.nativeOn给data.on
    // 因为on并不是真正的dom事件,而是Vnode自定义的一套on/emit事件
    // 最后创建出一个vnode
    vnode = createComponent(tag, data, context, children)
  }
  // 如果vnode有值,并且ns有值,那么就应用applyNS返回node
  // 如果没有ns,就返回一个空的Vnode
  if (isDef(vnode)) {
    if (ns) applyNS(vnode, ns)
    return vnode
  } else {
    return createEmptyVNode()
  }
}

// 应用命名空间
function applyNS (vnode, ns) {
  vnode.ns = ns
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    return
  }
  if (isDef(vnode.children)) {
    for (let i = 0, l = vnode.children.length; i < l; i++) {
      const child = vnode.children[i]
      if (isDef(child.tag) && isUndef(child.ns)) {
        applyNS(child, ns)
      }
    }
  }
}
