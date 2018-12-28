/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import { mark, measure } from '../util/perf'
import { createEmptyVNode } from '../vdom/vnode'
import { observerState } from '../observer/index'
import { updateComponentListeners } from './events'
import { resolveSlots } from './render-helpers/resolve-slots'

import {
  warn,
  noop,
  remove,
  handleError,
  emptyObject,
  validateProp
} from '../util/index'

export let activeInstance: any = null
export let isUpdatingChildComponent: boolean = false

export function initLifecycle (vm: Component) {
  const options = vm.$options

  // locate first non-abstract parent
  // 初始化Vue实例,拿到组件的options.parent
  // 根组件初始化new的时候parent显然是undefined
  // 在根组件初始化最终运行到_update的时候
  // 会把activeInstance给自己
  // 因为子组件里面的自定义组件需要createInstanceForVnode(options:{parent:activeInstace})
  // 值得注意的是_parentVnode是这个自定组件的vnode
  // 子组件在吃初始化的时候就会把取到这个parent,然后赋值给vm.$parent
  // 然后parent.$children.push(vm)
  // 这样父子组件就联系起来了
  let parent = options.parent
  if (parent && !options.abstract) {
    // 如果有parent并且options.abstract为false
    // 就循环找到找parent.$parent,只到abstract为false,这时就定位到第一个非抽象的parent了
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    // 然后把parent的$children属性里面压入当前组件
    parent.$children.push(vm)
  }
// 在组件上设置$parent
  vm.$parent = parent
// 如果parent存在就把parent.$root给vm.$root
// 没有parent,也就是跟组件,就把自身给$parent
  vm.$root = parent ? parent.$root : vm

// 初始化vm的$children属性,它是一个数组
  vm.$children = []
// 初始化一个$refs属性
  vm.$refs = {}
// 初始化_watcher = null
// 初始化_inactive = null
// 其余的_directInactive设置为false
// _isMounted初始化为false
// _isDestroyed初始化为false
// _isBeingDestroyed初始化为false
  vm._watcher = null
  vm._inactive = null
  vm._directInactive = false
  vm._isMounted = false
  vm._isDestroyed = false
  vm._isBeingDestroyed = false
}

export function lifecycleMixin (Vue: Class<Component>) {
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this
    if (vm._isMounted) {
      callHook(vm, 'beforeUpdate')
    }
    const prevEl = vm.$el
    const prevVnode = vm._vnode
    const prevActiveInstance = activeInstance
    activeInstance = vm
    vm._vnode = vnode
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    if (!prevVnode) {
      // initial render
      // 第一次更新的时候patch的第一个参数传的是vm.$el
      // 这个时候$el是query(selector)那个元素
      vm.$el = vm.__patch__(
        vm.$el, vnode, hydrating, false /* removeOnly */,
        vm.$options._parentElm,
        vm.$options._refElm
      )
      // no need for the ref nodes after initial patch
      // this prevents keeping a detached DOM tree in memory (#5851)
      vm.$options._parentElm = vm.$options._refElm = null
    } else {
      // updates
      // 每一次patch都会更新到vm.$el上
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    activeInstance = prevActiveInstance
    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  }

 // 强制更新,说白了就是直接调用update
  Vue.prototype.$forceUpdate = function () {
    const vm: Component = this
    if (vm._watcher) {
      vm._watcher.update()
    }
  }

 // 组件销毁的函数
  Vue.prototype.$destroy = function () {
    const vm: Component = this
    // 如果销毁了,就不做后续的事情
    if (vm._isBeingDestroyed) {
      return
    }
    // 没有销毁,先来个钩子beforeDestroy
    callHook(vm, 'beforeDestroy')
    // 然后将_isBeingDestroyed = true
    vm._isBeingDestroyed = true
    // remove self from parent
    const parent = vm.$parent
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm)
    }
    // teardown watchers
    // 这里的操作是在依赖中deps,找到每个dep,在dep的subs中移除当前这个watcher
    if (vm._watcher) {
      vm._watcher.teardown()
    }
    let i = vm._watchers.length
    // vm的watchers中移除每个deps
    while (i--) {
      vm._watchers[i].teardown()
    }
    // remove reference from data ob
    // frozen object may not have observer.
    // __ob__.vmCount减一
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--
    }
    // call the last hook...
    vm._isDestroyed = true
    // invoke destroy hooks on current rendered tree
    // 把Vm._vnode更新为null
    // 并把dom移除
    vm.__patch__(vm._vnode, null)
    // fire destroyed hook
    // 触发destroyed钩子
    callHook(vm, 'destroyed')
    // turn off all instance listeners.
    vm.$off()
    // remove __vue__ reference
    // 把vm.$el.__vue__设置为null
    if (vm.$el) {
      vm.$el.__vue__ = null
    }
  }
}

// 著名的mount的方法
// 真正对外保留的还要再包一层,$mount = function(el) {
  // el = query(el)
 // mountComponent(vm,el)
//}
export function mountComponent (
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  vm.$el = el
  // 判断有没有render函数
  if (!vm.$options.render) {
    // 如果没有render选项,就给一个空的VNode
    vm.$options.render = createEmptyVNode
    // 原则上提供的template需要通过compile来生成render
    // 这里默认是不需要去compile的,那么问题就来了,你引入的vue版本没有compile
    // 给警告了!
    if (process.env.NODE_ENV !== 'production') {
      /* istanbul ignore if */
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el || el) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        )
      }
    }
  }
  // 运行到这里证明有render函数,那么这里出发一个vm上面的钩子beforeMount
  callHook(vm, 'beforeMount')

  // 定义个updateComponent,这个是watcher的回调
  // 这个回调就是调用_update
  // 而_update就是patch
  let updateComponent
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    // 开发模式里面埋了一些点
    // 主要测试生成vnode要多久
    // update要多久
    updateComponent = () => {
      const name = vm._name
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`

      mark(startTag)
      const vnode = vm._render()
      mark(endTag)
      measure(`${name} render`, startTag, endTag)

      mark(startTag)
      vm._update(vnode, hydrating)
      mark(endTag)
      measure(`${name} patch`, startTag, endTag)
    }
  } else {
    // 生产模式只需要这一句话
    // vm._render会触发实际上组件依赖的get,然后完成收集依赖
    // updateComponent会在new一个Watcher之后再调用
    updateComponent = () => {
      vm._update(vm._render(), hydrating)
    }
  }

  // 将vm的_watcher赋值为一个watcher,在watcher中会调用updateComponent
  // updateComponent中会触发vm._render()，从而访问了state,从而触发
  // get中的dep.denpend(),然后把依赖放在watcher中收集,同时把该wathcer
  // 放入dep的subs中,如果第一次渲染,那么就会直接替换vm.$el然后更新
  // 如果后期set之后,dep去notify,在dep的subs中遍历watcher,然后将watcher
  // 放入一个队列中,收集完毕之后,开始flushing,调用每个watcher的run
  // 然后watcher.run,就是调用_update,由于Vnode传入的是更新后的Vnode,patch之前
  // vm._vnode并没有更新，然后就比较vm._vnode和Vnode,然后执行patch
  // patch通过diff算法高效完成dom的更新
  vm._watcher = new Watcher(vm, updateComponent, noop)
  hydrating = false

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  if (vm.$vnode == null) {
    vm._isMounted = true
    callHook(vm, 'mounted')
  }
  return vm
}

export function updateChildComponent (
  vm: Component,
  propsData: ?Object,
  listeners: ?Object,
  parentVnode: VNode,
  renderChildren: ?Array<VNode>
) {
  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = true
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren
  const hasChildren = !!(
    renderChildren ||               // has new static slots
    vm.$options._renderChildren ||  // has old static slots
    parentVnode.data.scopedSlots || // has new scoped slots
    vm.$scopedSlots !== emptyObject // has old scoped slots
  )

  vm.$options._parentVnode = parentVnode
  vm.$vnode = parentVnode // update vm's placeholder node without re-render

  if (vm._vnode) { // update child tree's parent
    vm._vnode.parent = parentVnode
  }
  vm.$options._renderChildren = renderChildren

  // update $attrs and $listensers hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  vm.$attrs = parentVnode.data && parentVnode.data.attrs
  vm.$listeners = listeners

  // update props
  if (propsData && vm.$options.props) {
    observerState.shouldConvert = false
    const props = vm._props
    const propKeys = vm.$options._propKeys || []
    for (let i = 0; i < propKeys.length; i++) {
      const key = propKeys[i]
      props[key] = validateProp(key, vm.$options.props, propsData, vm)
    }
    observerState.shouldConvert = true
    // keep a copy of raw propsData
    vm.$options.propsData = propsData
  }

  // update listeners
  if (listeners) {
    const oldListeners = vm.$options._parentListeners
    vm.$options._parentListeners = listeners
    updateComponentListeners(vm, listeners, oldListeners)
  }
  // resolve slots + force update if has children
  if (hasChildren) {
    vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    vm.$forceUpdate()
  }

  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = false
  }
}

function isInInactiveTree (vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true
  }
  return false
}

// 用在keep-alive中
// 让组件active,就是设置vm._directInactive为false
// 如果有children就一直递归下去
export function activateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = false
    if (isInInactiveTree(vm)) {
      return
    }
  } else if (vm._directInactive) {
    return
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false
    for (let i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i])
    }
    callHook(vm, 'activated')
  }
}
// 用在keep-alive中
// 让组件deactivate,设置vm._directInactive为true
// 如果有children就一直递归下去
export function deactivateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = true
    if (isInInactiveTree(vm)) {
      return
    }
  }
  if (!vm._inactive) {
    vm._inactive = true
    for (let i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i])
    }
    callHook(vm, 'deactivated')
  }
}

// callHook埋设钩子函数，使用户能够自定义插入一些自定义行为
// hook看起来是把同名的hook最终整合在一个数组中,相当于订阅了
// 这些钩子，然后在组件的生命周期的过程中,埋设这些,遍历这些
// 然后组个运行,由于这里的钩子是用户注入的,所以必要时候要给
// 一个抛异常的机制
export function callHook (vm: Component, hook: string) {
  const handlers = vm.$options[hook]
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      try {
        handlers[i].call(vm)
      } catch (e) {
        handleError(e, vm, `${hook} hook`)
      }
    }
  }
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook)
  }
}
