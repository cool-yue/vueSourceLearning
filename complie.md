# Compile一个模板经历的过程 #
vue.js包暴露的全局变量Vue，它有个全局方法compile,vue.js是一个完整的包，compile是用于编译template字符串的方法，通常配在webpack里面的都是runtime版本，runtime运行时版本是没有compile函数，而在webpack构建的应该中，通常都是用单文件组件来实现，template,script,css三段式，vue-loader把template抽取，script，css抽取出来，将template解析成render函数的字符串，给js文件，而css抽取出来形成了css文件，最后通过Vue的运行时包，负责diff，patch这些操作，下面来梳理下compile做了什么。
## 第一步：baseCompile ##
      baseCompile的代码如下:
      var ast = parse(template.trim(), options);
      optimize(ast, options);
      var code = generate(ast, options);
      return {
        ast: ast,
        render: code.render,
        staticRenderFns: code.staticRenderFns
      }
     template = `"<div class='aaa':class='bbb' id='mmmm' ref='dddd'>
      <p>{{mes}}</p>
      <div>abc</div>
      <bb></bb>
      <slot></slot>
    </div>"`;

1.通过第一步parse后,ast对象为下面这个对象:
![](https://i.imgur.com/41GqcW9.png)<br/>
下面是children中的几个节点p,div,bb,slot的截图<br/>
p<br/>
![](https://i.imgur.com/XmJ7eHb.png)
div<br/>
![](https://i.imgur.com/N0t7FyE.png)
bb<br/>
![](https://i.imgur.com/KsnO6NW.png)
slot<br/>
![](https://i.imgur.com/lpNEvCq.png)
2.第二步optimize，故名思意,就是优化，将静态的东西提取出来<br/>
3.第三步generate,就是生成代码code<br/>

     var state = new CodegenState(options);
      var code = ast ? genElement(ast, state) : '_c("div")';
      return {
        render: ("with(this){return " + code + "}"),
        staticRenderFns: state.staticRenderFns
      }
如代码所示,code为代码字符串,genElement就是将ast这个js对象，根据节点类型来生成代码,例如bb并不是内建的tag名，所以它是一个component，因此给它分配的代码为_c()，又比如{{mes}}，这个是一个options中的数据，那么将它渲染成文本，-s(mes)，比如slot属于内建的标签，因此对于_t(slot),这些code都是字符串，还并不是代码，为什么这一块的代码是需要弄成字符串，是因为用户的视图是灵活的，一个父组件有多少个子组件完全由解析的时候决定，而这些事情用户又不需要去做，同时template视图又不是单纯的静态模板，它是跟options中的变量息息相关的，比如如果是一个纯粹的元素标签，可以直接innerHTML，而一个component由于需要更options中的数据进行关联，从而形成MVVM的设计模式，因此对于一个template中，哪些需要创建component哪些只是静态的dom，这些都对应不同的代码，因此这些代码需要分析ast树来形成动态代码，如果是动态代码，那么就需要通过字符串来灵活地拼接，最后eval，将代码字符串转化成实实在在的代码。这里有几个关键点主要code只是代码，但是这个代码不是立即去执行，要把code里面的代码放入一个函数中，通过上面的代码看到了，code前面，拼接了一个with(this),这个this在运行时，this指向的是vm实例，vm上又绑定了proxy的代理，比如vm的上面有个属性叫mes，那么由于with的原因，将vm插入了作用域链的顶部，那么这个mes属性会在vm上面去找，也就是vm.mes，由于代理,vm.mes相当于去取vm._data.mes，同时触发mes的get（），从而收集依赖，因此render执行的时候，Vnode生成，Vnode也是一个JS对象，它相当于一个描述模板的对象，后期的patch方法就会根据Vnode的状态进行dom的插入，更新等操作。这里先不扯远了，回到generate，通过这个函数最后申城的state和code如下面所示。

    code:
    "_c('div',{ref:"dddd",staticClass:"aaa",class:bbb,attrs:{"id":"mmmm"}},
    [_c('p',[_v(_s(mes))]),
     _c('div',[_v("abc")]),
     _c('bb'),
     _t("default")],
     2)"
state:<br/>
![](https://i.imgur.com/mRwF6L8.png)<br/>
这里的staticRenderFns并没有东西，证明按照他们的优化机制，并没有找出静态的东西。什么情况系是可以放入静态render中？这个代码非常丑想，为什么会要这些"_c","\_v","\_t"这些，是因为这样能够以最佳的性能来渲染代码，字符串当然越短占用的内存越少。下面来看看，这些以"\_"开头的函数都是些啥？如下所示：

      Vue.prototype._o = markOnce;
      Vue.prototype._n = toNumber; //转化成数字
      Vue.prototype._s = toString; //转化成字符串
      Vue.prototype._l = renderList;// 渲染List
      Vue.prototype._t = renderSlot; //渲染Slot
      Vue.prototype._q = looseEqual;// 宽松的相当
      Vue.prototype._i = looseIndexOf;// 宽松的索引
      Vue.prototype._m = renderStatic; // 渲染静态
      Vue.prototype._f = resolveFilter; // 处理filter
      Vue.prototype._k = checkKeyCodes; // 检查keyCodes
      Vue.prototype._b = bindObjectProps; // 绑定对象Object
      Vue.prototype._v = createTextVNode;  // 创建文本节点Vnode
      Vue.prototype._e = createEmptyVNode; // 创建空的Vnode
      Vue.prototype._u = resolveScopedSlots; // 处理scopedSlot
      Vue.prototype._g = bindObjectListeners; // 绑定对象监听器,严格来说就是 @XXX=XXX
      vm._c = createElement(a,b,c,d,e);// return 一个Vnode对象
上面的代码的细节这里不写,我们来分析上面生成的code为什么是这样,通过前面的模板，最外面的标签是div,因此_c的第一个参数是"div"，最外面的div有class='aaa':class='bbb' id='mmmm' ref='dddd'，第二个参数是处理这些属性的，ref对应ref，class对应staticClass，：class对应class，id对应attrs：{id："mmmm"},第三个参数是传入children，该children里面也是需要Vnode,因此每个子元素原则上应该都是_c,p元素作为第一个子元素，第一个参数显然就是'p',这里注意，由于p并没有什么属性，第二个参数直接就是一个数组的children元素,Vue的creatElment这里内部包装了一次，做了个优化，考虑到了，如果没有属性的话，第二个参数就需要给个占位符,参数数组这么来写，\_c('p',null,[xxx]),而实际上中间这个null并不需要写进去，因为真正的createElment外面包装了一个过滤参数的逻辑，第二个参数是需要严格的对象形式的，第三个参数children要么是数组，要么是字符串，它会判断第二个参数如果是这个数组或者是个原始值，那么就认为第二参数实际上是第三个参数，而第二个参数，在内部实际上会设置为null，这样做有至少有2个好处，方便使用，第二生成的代码，不需要把"\_c"的第二个参数指定为null或者undefined，这样节约了代码字符串的长度，提升了性能。mes是一个mustache风格的变量，因此{{mes}}最终会访问vm.mes,并且toString一下，然后生成文本Vnode。第二个元素div,中间的abc可以认为是静态内容，因此这里可以把这个直接生成文本节点，abc=>"\_v('abc')",第三个初步解析就是一个标签，但它不是内建标签，也没有文本，也没有属性，因此直接就"\_c('bb')",第五个是<slot>,在ast中它被认为是一个元素，但是Vnode作为针对Vue框架的东西，<slot>对应Vue来说是另外的一个东西，需要另外来解析，由于slot不具名，因此名称为"default",所以使用'\_t("default")',最后一个值为2，它是"ALWAYS_NORMALIZE = 2"的意思，时刻都要标准化。如果是1，就是简单的标准化，SIMPLE_NORMALIZE,具体做了哪些这里不分析。所以render的内部代码就这样实现了，最后想说的是，_createElement这个函数，是在vm._c这种方式绑定上去的，也就是说每个组件实例都有这个。
## genElement ##
写到这里，东西有点多，这里再来梳理一下，从上面的代码中能够看到从parse tempalte字符串，将字符串转化成了ast，ast是一个“一视同仁”的template数的描述对象，而从ast通过方法optimize之后，只是将静态代码抽取出来进行优化，目前的ast还是ast，最后一步generate code通过将ast转化成了render函数的code，这个方法实际上做了很多事情。下面来一一列出来，这其中只运行了一个方法，就是genElement方法，下面贴出genElement方法:

    function genElement (el, state) {
      if (el.staticRoot && !el.staticProcessed) {
    return genStatic(el, state)
      } else if (el.once && !el.onceProcessed) {
    return genOnce(el, state)
      } else if (el.for && !el.forProcessed) {
    return genFor(el, state)
      } else if (el.if && !el.ifProcessed) {
    return genIf(el, state)
      } else if (el.tag === 'template' && !el.slotTarget) {
    return genChildren(el, state) || 'void 0'
      } else if (el.tag === 'slot') {
    return genSlot(el, state)
      } else {
    // component or element
    var code;
    if (el.component) {
      code = genComponent(el.component, el, state);
    } else {
      var data = el.plain ? undefined : genData$2(el, state);
    
      var children = el.inlineTemplate ? null : genChildren(el, state, true);
      code = "_c('" + (el.tag) + "'" + (data ? ("," + data) : '') + (children ? ("," + children) : '') + ")";
    }
    // module transforms
    for (var i = 0; i < state.transforms.length; i++) {
      code = state.transforms[i](el, code);
    }
    return code
      }
    }

如上图所示，从ast转化到最终的render，判断了这么多情况。<br/>
静态

    if (el.staticRoot && !el.staticProcessed) {
    	return genStatic(el, state)
    }
    function genStatic (el, state) {
      el.staticProcessed = true;
      state.staticRenderFns.push(("with(this){return " + (genElement(el, state)) + "}"));
      return ("_m(" + (state.staticRenderFns.length - 1) + (el.staticInFor ? ',true' : '') + ")")
    }

<br/>
一次渲染<br/>

    if (el.once && !el.onceProcessed) {
    	return genOnce(el, state)
    }
    function genOnce (el, state) {
      el.onceProcessed = true;
      if (el.if && !el.ifProcessed) {
    	return genIf(el, state)
      } else if (el.staticInFor) {
    	var key = '';
    	var parent = el.parent;
    	while (parent) {
      		if (parent.for) {
    			key = parent.key;
    			break
      		}
      		parent = parent.parent;
    	  }
    	if (!key) {
      "development" !== 'production' && state.warn(
    		"v-once can only be used inside v-for that is keyed. "
      	);
      	return genElement(el, state)
    	}
    return ("_o(" + (genElement(el, state)) + "," + (state.onceId++) + (key ? ("," + key) : "") + ")")
    } else {
    	return genStatic(el, state)
      }
    }
<br/>
处理v-for<br/>

    if (el.for && !el.forProcessed) {
    	return genFor(el, state)
    }
    
    function genFor (
      el,
      state,
      altGen,
      altHelper
    ) {
      var exp = el.for;
      var alias = el.alias;
      var iterator1 = el.iterator1 ? ("," + (el.iterator1)) : '';
      var iterator2 = el.iterator2 ? ("," + (el.iterator2)) : '';
    
      if ("development" !== 'production' &&
    	state.maybeComponent(el) &&
    	el.tag !== 'slot' &&
    	el.tag !== 'template' &&
    	!el.key
      	) {
    	state.warn(
	      "<" + (el.tag) + " v-for=\"" + alias + " in " + exp + "\">: component lists rendered with " +
	      "v-for should have explicit keys. " +
	      "See https://vuejs.org/guide/list.html#key for more info.",
	      true /* tip */
    	);
      }
    
      el.forProcessed = true; // avoid recursion
      return (altHelper || '_l') + "((" + exp + ")," +
    	"function(" + alias + iterator1 + iterator2 + "){" +
      		"return " + ((altGen || genElement)(el, state)) +
    	'})'
    }
处理v-if<br/>

     if (el.if && !el.ifProcessed) {
    	return genIf(el, state)
      }
    
     function genIf (
      el,
      state,
      altGen,
      altEmpty
    ) {
      el.ifProcessed = true; // avoid recursion
      return genIfConditions(el.ifConditions.slice(), state, altGen, altEmpty)
    }
    
    function genIfConditions (
      conditions,
      state,
      altGen,
      altEmpty
    ) {
      if (!conditions.length) {
    return altEmpty || '_e()'
      }
    
      var condition = conditions.shift();
      if (condition.exp) {
    	return ("(" + (condition.exp) + ")?" + (genTernaryExp(condition.block)) + ":" + (genIfConditions(conditions, state, altGen, altEmpty)))
      } else {
    	return ("" + (genTernaryExp(condition.block)))
      }
<br/>
处理template<br/>

     if (el.tag === 'template' && !el.slotTarget) {
        return genChildren(el, state) || 'void 0'
      }
<br/>
处理slot<br/>

     if (el.tag === 'slot') {
    	return genSlot(el, state)
      }
    
    
    function genSlot (el, state) {
      var slotName = el.slotName || '"default"';
      var children = genChildren(el, state);
      var res = "_t(" + slotName + (children ? ("," + children) : '');
      var attrs = el.attrs && ("{" + (el.attrs.map(function (a) { return ((camelize(a.name)) + ":" + (a.value)); }).join(',')) + "}");
      var bind$$1 = el.attrsMap['v-bind'];
      if ((attrs || bind$$1) && !children) {
    	res += ",null";
      }
      if (attrs) {
    	res += "," + attrs;
      }
      if (bind$$1) {
    	res += (attrs ? '' : ',null') + "," + bind$$1;
      }
      return res + ')'
    }
<br/>
处理compnent 和 element:

    var code;
    if (el.component) {
      code = genComponent(el.component, el, state);
    } else {
      var data = el.plain ? undefined : genData$2(el, state);
    
      var children = el.inlineTemplate ? null : genChildren(el, state, true);
      code = "_c('" + (el.tag) + "'" + (data ? ("," + data) : '') + (children ? ("," + children) : '') + ")";
    }
    // module transforms
    for (var i = 0; i < state.transforms.length; i++) {
      	code = state.transforms[i](el, code);
    }
    	return code
     }
    
    function genComponent (
      componentName,
      el,
      state
    ) {
      var children = el.inlineTemplate ? null : genChildren(el, state, true);
      return ("_c(" + componentName + "," + (genData$2(el, state)) + (children ? ("," + children) : '') + ")")
    }

<br/>
