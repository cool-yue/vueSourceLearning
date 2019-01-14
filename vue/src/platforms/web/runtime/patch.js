/* @flow */

import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
import baseModules from 'core/vdom/modules/index'
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.

// baseModules = 
// platformModules有
// style:显然是有dom才能去添加对应的style
// class
// events:处理原生事件
// attrs:类似于id啊 这类的
// dom-props:这个处理innerHTML类似dom.xxx = xxxx,这样来处理


// baseModules有:refs directive
// directive是数组中最后一个一个对象,在所有内建模块都渲染到dom上面的时候
// 再执行directive
const modules = platformModules.concat(baseModules)

// 平台的patch
// 最终整个了上面那些模块的所有的 create 和 update
export const patch: Function = createPatchFunction({ nodeOps, modules })
