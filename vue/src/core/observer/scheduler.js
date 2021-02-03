/* @flow */

import type Watcher from './watcher'
import config from '../config'
import { callHook, activateChildComponent } from '../instance/lifecycle'

import {
  warn,
  nextTick,
  devtools
} from '../util/index'

export const MAX_UPDATE_COUNT = 100

const queue: Array<Watcher> = []
const activatedChildren: Array<Component> = []
let has: { [key: number]: ?true } = {}
let circular: { [key: number]: number } = {}
let waiting = false
let flushing = false
let index = 0

/**
 * Reset the scheduler's state.
 */
function resetSchedulerState () {
  index = queue.length = activatedChildren.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

/**
 * Flush both queues and run the watchers.
 */
// queue是一个装有watcher的array,根据组件渲染的顺序父组件的id绝对会小于子组件
// 这个id在created的时候就已经生成了,它是一个id++的操作,没new一次都会++
// 而父子之间加载的顺序是,首先加载父组件直到beforeMounted
// 然后加载子组件直到beforeMounted
// 为什么会在beforeMounted这个点停住,是因为所有组件只有在mount的时候才会重新渲染
// 新的依赖,在patch这个方法中,patch之前,并不知道数据有没有改变,例如子组件的状态改了
// 那么就需要子组件也执行到beforeMount,
// 在mount执行的时候,父组件里面各种子组件,他的状态都需要先mount才知道组件视图的依赖，才知道子组件里面的dom是怎样
// 因此当所有子组件mount完之后变成mounted,父组件才会mounted
// 而beforeMount之前的钩子，都是在初始化组件实例
function flushSchedulerQueue () {
  flushing = true
  let watcher, id

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.

  // 这里根据id排序一下,上面官方个3个理由
  // 第一,父组件的created永远在child之前
  // 第二,用户自动的watcher会在渲染时候的watcher之前运行
  // 第三,如果一个组件在一个父组件的watcher运行中被销毁,它的watchers可以被跳过
  queue.sort((a, b) => a.id - b.id)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers

  // 这里并没有缓存length属性,因为更多的watchers可能被push进去
  // 这里主要是在queue中执行每个watcher,并且执行一次将has里面对应的id设置为null,也就是重复的组件不会再执行了
  //
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    id = watcher.id
    has[id] = null
    watcher.run()

    // in dev build, check and stop circular updates.
    // 下面阻止循环更新
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > MAX_UPDATE_COUNT) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // keep copies of post queues before resetting state
  const activatedQueue = activatedChildren.slice()
  const updatedQueue = queue.slice()

  // 重置ScheldulerState,将has,circle设置为{}, waiting = flushing = false,index = queue.length = activatedChildren.length = 0
  resetSchedulerState()

  // call component updated and activated hooks
  callActivatedHooks(activatedQueue)
  callUpdatedHooks(updatedQueue)

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }
}

// 如果_isMounted了,在queue中调用每个vm上定义的updated钩子函数
function callUpdatedHooks (queue) {
  let i = queue.length
  while (i--) {
    const watcher = queue[i]
    const vm = watcher.vm
    if (vm._watcher === watcher && vm._isMounted) {
      callHook(vm, 'updated')
    }
  }
}

/**
 * Queue a kept-alive component that was activated during patch.
 * The queue will be processed after the entire tree has been patched.
 */
export function queueActivatedComponent (vm: Component) {
  // setting _inactive to false here so that a render function can
  // rely on checking whether it's in an inactive tree (e.g. router-view)
  vm._inactive = false
  activatedChildren.push(vm)
}

function callActivatedHooks (queue) {
  for (let i = 0; i < queue.length; i++) {
    queue[i]._inactive = true
    activateChildComponent(queue[i], true /* true */)
  }
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
// 把一个watcher对象放进watcher queue里面
// 多id任务会被跳过,除非当队列被清理的时候,watch被压进去
// 该函数,传入一个watcher对象


// 根据watcher的数量,会收集需要去更新视图的watcher
// 并且同一个id只会push一次
// 如果不在flushing,那么就直接push
// 如果在flushing,从queue的队尾开始找,按顺序插入到合适的位置
// 因为在flushing的时候,queue队列已经根据id排好顺序了

// 2021新的感悟
// flushing的时候为什么要清空has[id] = null
// 想像一个情况,如果一个组件在更新的时候某些状态发生了改变,那么这个组件的watcher
// 会被推到这个queue中,但是同时这个属性改变导致子组件的改变，子组件的watcher也要被push进去
// 但是子组件又emit了,去改变父组件另外一个状态,这个时候,父组件的wather又会被触发,但是此时
// 父组件的state已经被子组件改了,但是这时,实际上还没开始渲染视图,但是实际上state已经改了
// 那么由于render是依赖这些state的,实际上nextTick的一次更新,就能顾及所有的这些改变的属性
// 第二次子组件触发父组件的元素改变的时候,原则上也会收集这个watcher,但是由于has作为了一个set
// 过滤的作用,导致这种2次操作state的情况，只有一个watcher被压入到queue中,因为2次的id一样
// 同时由于改变状态是同步的,nextTick去flushing queue的时候,所有的状态都是更新后的状态
// 一次render就足够了,而如果是异步更新这个状态可能就需要多次更新视图了

// 将watcher放入queue队列中
// 并将id放入一个伪set里面,防止重复
// 然后如果在flushing过程中有watcher进来,也会放在合适的位置
// 再flushing的时候waiting = true

// 这个位置很关键, 之所以vue可以vnode可以一次更新多次属性的改变就是因为一个视图的watcher
// 比如一个模板`<div>{{a}}</div>`,a从1变到2再变到3,其实要经历过3次,dep.notify(),但是
// 如下代码由于watcher收集会去重,所以导致实际上3次notify,最终的更新queue中只会有一个watcher
// 为什么这样可以呢？这些对于a的修改是同步操作,a通知的watcher()实际上会在 nextTick去更新,nextTick
// 的时候,对于同步操作来说,a的值直接就是3


// 只放入到队列中一次
// 并且按照id的从小到大的顺序(从父到子),为什么从父到子,是因为父组件可以v-if掉子组件,子组件压根不渲染
// 所以要从父组件开始
export function queueWatcher (watcher: Watcher) {
  const id = watcher.id
  if (has[id] == null) {
    has[id] = true
    if (!flushing) {
      queue.push(watcher)
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      let i = queue.length - 1
      while (i > index && queue[i].id > watcher.id) {
        i--
      }
      queue.splice(i + 1, 0, watcher)
    }
    // queue the flush
    if (!waiting) {
      waiting = true
      nextTick(flushSchedulerQueue)
    }
  }
}
