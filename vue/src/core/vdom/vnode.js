/* @flow */
// 要理解VNode里面有哪些东西
// tag表示最外层标签
// children: 数组类型，包含了当前节点的子节点
// text: 当前节点的文本，一般文本节点或注释节点会有该属性
// elm: 当前虚拟节点对应的真实的dom节点
// ns: 节点的namespace
// context: 编译作用域
// functionalContext: 函数化组件的作用域
// key: 节点的key属性，用于作为节点的标识，有利于patch的优化
// componentOptions: 创建组件实例时会用到的选项信息
// child: 当前节点对应的组件实例
// parent: 组件的占位节点
// raw: raw html
// isStatic: 静态节点的标识
// isRootInsert: 是否作为根节点插入，被<transition>包裹的节点，该属性的值为false
// isComment: 当前节点是否是注释节点
// isCloned: 当前节点是否为克隆节点
// isOnce: 当前节点是否有v-once指令


// data有哪些值
/*export interface VNodeData {
  key?: string | number;             <div :key=1></div>
  slot?: string;         <div :slot=header></div>
  scopedSlots?: { [key: string]: ScopedSlot };
  ref?: string;       <div ref="aaa"></div>
  tag?: string;       <div><div> tag ="div"
  staticClass?: string;      <div class="abc"></div>
  class?: any;      <div :class="abc"></div>
  staticStyle?: { [key: string]: any }; <div style="color:red"></div>
  style?: Object[] | Object;   <div :style="[{color:red},{},{}]"></div>
  props?: { [key: string]: any };    <div :props></div>
  attrs?: { [key: string]: any };    元素普通的属性 例如 id=xxx
  domProps?: { [key: string]: any };  dom的属性,例如innerHTML
  hook?: { [key: string]: Function };   非人工钩子
  on?: { [key: string]: Function | Function[] }; vue自定义事件
  nativeOn?: { [key: string]: Function | Function[] };   原生事件
  transition?: Object; 是否在Mtransition中？
  show?: boolean; v-show
  // 是否使用了template
  inlineTemplate?: {
    render: Function;
    staticRenderFns: Function[];
  };
  // 指令
  directives?: VNodeDirective[];
  keepAlive?: boolean;
}
*/
export default class VNode {
  tag: string | void;
  data: VNodeData | void;
  children: ?Array<VNode>;
  text: string | void;
  elm: Node | void;
  ns: string | void;
  context: Component | void; // rendered in this component's scope
  functionalContext: Component | void; // only for functional component root nodes
  key: string | number | void;
  componentOptions: VNodeComponentOptions | void;
  componentInstance: Component | void; // component instance
  parent: VNode | void; // component placeholder node
  raw: boolean; // contains raw HTML? (server only)
  isStatic: boolean; // hoisted static node
  isRootInsert: boolean; // necessary for enter transition check
  isComment: boolean; // empty comment placeholder?
  isCloned: boolean; // is a cloned node?
  isOnce: boolean; // is a v-once node?
  asyncFactory: Function | void; // async component factory function
  asyncMeta: Object | void;
  isAsyncPlaceholder: boolean;
  ssrContext: Object | void;

  constructor (
    tag?: string,
    data?: VNodeData,
    children?: ?Array<VNode>,
    text?: string,
    elm?: Node,
    context?: Component,
    componentOptions?: VNodeComponentOptions,
    asyncFactory?: Function
  ) {
    this.tag = tag
    this.data = data
    this.children = children
    this.text = text
    this.elm = elm
    this.ns = undefined
    this.context = context
    this.functionalContext = undefined
    this.key = data && data.key
    this.componentOptions = componentOptions
    this.componentInstance = undefined
    this.parent = undefined
    this.raw = false
    this.isStatic = false
    this.isRootInsert = true
    this.isComment = false
    this.isCloned = false
    this.isOnce = false
    this.asyncFactory = asyncFactory
    this.asyncMeta = undefined
    this.isAsyncPlaceholder = false
  }

  // DEPRECATED: alias for componentInstance for backwards compat.
  /* istanbul ignore next */
  get child (): Component | void {
    return this.componentInstance
  }
}

export const createEmptyVNode = (text: string = '') => {
  const node = new VNode()
  node.text = text
  node.isComment = true
  return node
}

export function createTextVNode (val: string | number) {
  return new VNode(undefined, undefined, undefined, String(val))
}

// optimized shallow clone
// used for static nodes and slot nodes because they may be reused across
// multiple renders, cloning them avoids errors when DOM manipulations rely
// on their elm reference.
export function cloneVNode (vnode: VNode): VNode {
  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    vnode.children,
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  )
  cloned.ns = vnode.ns
  cloned.isStatic = vnode.isStatic
  cloned.key = vnode.key
  cloned.isComment = vnode.isComment
  cloned.isCloned = true
  return cloned
}

export function cloneVNodes (vnodes: Array<VNode>): Array<VNode> {
  const len = vnodes.length
  const res = new Array(len)
  for (let i = 0; i < len; i++) {
    res[i] = cloneVNode(vnodes[i])
  }
  return res
}
