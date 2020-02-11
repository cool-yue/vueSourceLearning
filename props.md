## props ##
props在属于initState这一部分的一块内容，其余几个内容分别是data，methods，watch，computed，由于data跟视图有很大的联系，准备抽取出来把data，Dep，Watch放在一起写，而props在vue的官方有很长的篇幅讲解用法，因此props也单独拎出来写。
## props模板渲染 为什么v-bind="xxx"可以将xxx中的属性直接并入成为对应的props##

    var template = "<div v-bind='ccc' :myName='jim' myAge='18' :my-height='177'  myGod my-shoe id='mmmm' ></div>";
    with(this){return _c('div',_b({attrs:{"myName":jim,"myAge":"18","my-height":177，myGod："",my-shoe:"","id":"mmmm"}},'div',ccc,false))}
    Vue.prototype._b = bindObjectProps;
    // 解析为_b({attrs:{"myName":jim,"myAge":"18","my-height":177,myGod："",my-shoe:"","id":"mmmm"}},'div',ccc,false);
    // 如果没有v-bind就为with(this){return _c('div',{attrs:{"myName":jim,"myAge":"18","my-height":177,"id":"mmmm"}})}
    // 注意v-bind不可以2次声明，这样会报错

针对上面的模板，生成的渲染函数为下面的结果，其中_b为bindObjectProps，可以看到在render模板的时候，props全部放进了attrs这个对象里面（后面会抽取出来），下面看看bindObjectProps做了什么。可以知道带":"和不带":"的区别，带":"最终会解析成例如:aaa="xxx"，会解析成aaa:xxx,而不带点解析成aaa:"xxx"，最终这些都是js代码，不带引号就是变量，带引号就是字符串，所以不带":"的永远是字符串

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
下面看看第三步中的验证策略,主要是做了哪些工作<br/>
验证通过后，然后最终返回拿到的值。验证主要依据的是用户传入的options中对props的定义与实际在标签上解析到的propsData进行比对,如上面代码所示，通过循环遍历options中的props属性，然后对每一个定义的值进行验证，首先拿到options中的prop选项，对于type是boolean的情况，对于value是undefined的情况，也就是标签上并没有传这个值，最终会拿到default的值，然后对这个值进行观察，如果在非开发的状态下，进行值的验证。通常情况下，定义个props的属性可以有以下几个类型：

    type PropOptions = {
      type: Function | Array<Function> | null,
      default: any,
      required: ?boolean,
      validator: ?Function
    };

但是一般情况下就给个函数如下面这样:

    props:{
    	abc:String
    }
     props:{
    	abc:[String,Array]
    }
props的属性如此灵活，但是这些并不需要标准化，assertProps这个函数基本上就能够判断属性是否满足，最终如果validator存在再执行validator。
## 为什么父组件的值变化会影响子组件，而子组件变化不会影响父组件 ##
props这个属性在子组件中其实跟data没有太大区别，在子组件里面，通过this.xxx = yyy子组件依然会修改子组件的视图,但是这样会导致一个结果就是父组件的值没有变化（primitive value）,而子组件渲染的视图变化成了修改的样子,这样其实违背了props设计的初衷，当然vue会给出警告，props设计的初衷是通过父组件由子组件组成，然而子组件的一些状态是通过父组件来进行确定。下面来说说初始化以及响应式的的原理。对于以下代码:

    <div><abc  :aaa = "bbb"></abc></div>
    data（） {
        return {
            bbb:6
        }
    }
    components:{
        abc
    }
首先要明确几点首先<abc></abc>的上下文(context)属于父组件范围的,而<abc>具体怎么渲染，是属于子组件的,组件总是从父组件到子组件进行渲染，因此这句话属于父组件的template上下文，因此bbb属于父组件的变量，渲染的时候并不管abc是不是内建标签，父组件就当这是一个叫abc的标签，然后有一个属性叫aaa绑定的是一个当前环境的上下文中的bbb变量。最终父组件的渲染会变成这样：

    tag:"div"
    children:[
        {
            tag:"vue-component-1-abc",
            attr:{},
            comnponentOption:{
                propsData:{aaa:6},
                hook:{init：xxx,prepatch:xxx}
            }
        }
    ]
由于html的解析是一个树形结构，因此在第一次render父组件的时候with(this){_c("div",[_c("abc",attr:{"aaa":bbb})])},这个this就是父组件的上下文环境，所以当render的时候就变成了下面这样:

    _c("abc",attr:{"aaa":6})
由于abc不是保留字因此，会把abc这个标签可以看成是vue-component，会为这个vnode加上componentOptions属性，在父组件渲染的时候已经拿到了abc的options，然后通过拿到options中的props,然后与attr:{"aaa":6}进行对比，对于abc组件可能是下面这样的:

    props:{
        aaa:Number
    }
在props中找到了aaa，发现在attr中也有，然后就抽取attr中的aaa,attr就变成了{},把抽取的属性放到一个propsData属性中，作为componentOptions，dom更新的时候进行实例化使用。为什么父组件修改可以让子组件也修改呢？父组件的_render要执行这个_c("div",[_c("abc",attr:{"aaa":bbb})]),并且bbb属于data，当bbb修改的时候，bbb中的dep会进行notify到watcher中去执行updateComponent操作，首先要_render，那么此时加入this.bbb改成了5，那么这个render表达式就变成了下面这样:

    _c("div",[_c("abc",attr:{"aaa":5})])

所以基于5这个值会生成新的vnode,通过diff算法来进行dom的更新。