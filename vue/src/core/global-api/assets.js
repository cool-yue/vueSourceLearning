/* @flow */

import config from '../config'
import { ASSET_TYPES } from 'shared/constants'
import { warn, isPlainObject } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
//   ASSET_TYPES = [
//   'component',
//   'directive',
//   'filter'
//   ]
// 绑定了3个函数,Vue.component,Vue.directive,Vue.filter
// 函数接受2个参数,第一个参数是id 字符串类型,第二个参数是definition,为Object或者function
// 函数里面的逻辑:
// 如果第二个参数没传,那么返回options["属性名"+s][id]
// 如果第二个参数传入了,在非production模式下,有3个种情况
// 第一种component,全局注册组件,如果不是保留标签,且不是对象,就把Vue.options.components.id = definition
// this.options._base => Vue
// 第二种component,为对象,如果第二个参数哟name,优先使用这个name,如果没有name,把第一个参数id作为name,然后vue.extend(组件配置)(这里详细见extend.js)
// 返回一个组件组件构造器,然后返回
//最后一种情况是directive,这种情况下如果是function就把definition变成{bind:definition,updata:definition},相当于一个标准化过程
// 然后赋值给Vue.options中的directives的id属性
  ASSET_TYPES.forEach(type => {
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      if (!definition) {
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        if (process.env.NODE_ENV !== 'production') {
          if (type === 'component' && config.isReservedTag(id)) {
            warn(
              'Do not use built-in or reserved HTML elements as component ' +
              'id: ' + id
            )
          }
        }
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
