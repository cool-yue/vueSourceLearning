## props ##
props在属于initState这一部分的一块内容，其余几个内容分别是data，methods，watch，computed，由于data跟视图有很大的联系，准备抽取出来把data，Dep，Watch放在一起写，而props在vue的官方有很长的篇幅讲解用法，因此props也单独拎出来写。
## props模板渲染 为什么v-bind="xxx"可以将xxx中的属性直接并入成为对应的props##
    var template = "<div v-bind='ccc' :myName='jim' myAge='18' :my-height='177'  myGod my-shoe id='mmmm' ></div>";
    with(this){return _c('div',_b({attrs:{"myName":jim,"myAge":"18","my-height":177，myGod："",my-shoe:"","id":"mmmm"}},'div',ccc,false))}
    Vue.prototype._b = bindObjectProps;
    // 解析为_b({attrs:{"myName":jim,"myAge":"18","my-height":177,myGod："",my-shoe:"","id":"mmmm"}},'div',ccc,false);
    // 如果没有v-bind就为with(this){return _c('div',{attrs:{"myName":jim,"myAge":"18","my-height":177,"id":"mmmm"}})}
    // 注意v-bind不可以2次声明，这样会报错
针对上面的模板，生成的渲染函数为下面的结果，其中_b为bindObjectProps，可以看到在render模板的时候，props全部放进了attrs这个对象里面（后面会抽取出来），下面看看bindObjectProps做了什么。

     function bindObjectProps (
      data: any,
      tag: string,
      value: any,
      asProp: boolean,
      isSync?: boolean
    ): VNodeData {
      // 先看有没有value值
      // 有值,必须是对象或者数组，如果是数组将数组转化为数组对象（key为数字）
      // 基本上这个函数就是针对value来并入属性的
      // 拿到value这个对象后,开始遍历这个对象
      // 如果这个 value对象存在这些键值{class:"",style:"",key:"",ref:"",slot:""}
      // 就把data里面不存在这个key,就把value的key对应的值，赋给data,也就是说把上面这几个属性的值
      // 抽取出来并入到data里面
      // 如果不是上面的这些属性,那就就先拿到attrs里面的type属性,这里为undefined
      // asProps为false，因此要看config.mustUseProps(tag,type,key)
      // 如果这个函数返回了true
      // 那么就取到domProps，然后把value里面存在的key而domProps不存在的赋值到domProps对象中
      // 如果这个函数返回了false
      // 那么就并入到data.attrs中
      if (value) {
    if (!isObject(value)) {
      process.env.NODE_ENV !== 'production' && warn(
    'v-bind without argument expects an Object or Array value',
    this
      )
    } else {
      if (Array.isArray(value)) {
    value = toObject(value)
      }
      let hash
      for (const key in value) {
    if (
      key === 'class' ||
      key === 'style' ||
      isReservedAttribute(key)
    ) {
      hash = data
    } else {
      const type = data.attrs && data.attrs.type
      hash = asProp || config.mustUseProp(tag, type, key)
    ? data.domProps || (data.domProps = {})
    : data.attrs || (data.attrs = {})
    }
    if (!(key in hash)) {
      hash[key] = value[key]
    
      if (isSync) {
    const on = data.on || (data.on = {})
    on[`update:${key}`] = function ($event) {
      value[key] = $event
    }
      }
    }
      }
    }
      }
      return data
    }
严格来说，这个方法绝大部分做的工作，就是把v-bind="xxx",这个xxx对象中的属性，并入到正确的data对象中，分析这个主要是为了说明通过v-bind="xxx"能够把xxx这个对象中的键值对并入到data中应该存在的位置，例如xxx={abc:11},相当于attr:{"abc":11},逻辑较为清晰，判断了一些边界条件，这个在使用的过程中几乎很难碰到这种边界条件。
## initProps ##
用户每次定义props的时候基本上props:["aaa","bbb","ccc"],为什么访问的时候每次只需要vm.aaa,vm.bbb就够了，因为跟data一样，options只是用户传入的对象，在实例化对应的vm的时候，是把用户定义的props对象并入到vm._props，然后再做一次代理，就是访问的是vm.aaa，其实是去访问的vm._props.aaa,这样就实现了props与vm的关联，而_props是怎么来的，现在看看具体的initProps的过程。


    // 初始化props
    // 第一个参数是vue实例,第二个参数是vm.options
    //
    function initProps (vm: Component, propsOptions: Object) {
      const propsData = vm.$options.propsData || {}
      const props = vm._props = {}
      // cache prop keys so that future props updates can iterate using Array
      // instead of dynamic object key enumeration.
      const keys = vm.$options._propKeys = []
      const isRoot = !vm.$parent
      // root instance props should be converted
      // 根组件需要被转化
      observerState.shouldConvert = isRoot
      for (const key in propsOptions) {
    	keys.push(key)
    	const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    	if (process.env.NODE_ENV !== 'production') {
      		if (isReservedAttribute(key) || config.isReservedAttr(key)) {
    		warn(
      		`"${key}" is a reserved attribute and cannot be used as component prop.`,
      		vm
    		)
      }
      	defineReactive(props, key, value, () => {
    	if (vm.$parent && !isUpdatingChildComponent) {
     	 warn(
    		`Avoid mutating a prop directly since the value will be ` +
    		`overwritten whenever the parent component re-renders. ` +
    		`Instead, use a data or computed property based on the prop's ` +
    		`value. Prop being mutated: "${key}"`,
    		vm
      	)
    	}
      })
    } else {
      	// props上面的key定义成为响应式
      	// 在vm上作为_props的存在
      	defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
      }
      observerState.shouldConvert = true
    }
实际上initProps只做了以下几个工作：<br/>
1.拿到$options.propsData,创建vm._props,vm._propKeys(装props key数组)<br/>
2.判断是否是根组件<br/>
3.然后遍历options中的props，然后把键push进propKeys数组,然后基于propData和options中的props来验证这个key，最后拿到值<br/>
4.defineReactive()<br/>
5.代理到_props<br/>
下面看看第三步中的验证策略,主要是做了哪些工作
