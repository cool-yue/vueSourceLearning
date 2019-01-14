// Vue.component("myDiv",{
// 	template:"<div><slot>我是默认的</slot></div>",
// 	mounted() {
// 		console.log("myDiv this.$slots",this.$slots);
// 		console.log("myDiv",this.$options);
// 	}
// });

// Vue.component("child",{
// 	template:`<div class="child">
//                <h3>这里是子组件</h3>
//                <slot :data="data"></slot>
//              </div>`,
//     data() {
// 		return {
// 	       data: ['zhangsan','lisi','wanwu','zhaoliu','tianqi','xiaoba'],
// 		}
// 	},
// 	beforeCreate() {
// 		console.log(this.data);
// 	},
// 	mounted() {
// 		console.log(this.data);
// 	}
// });

// Vue.component("myLi",{
// 	template:`<li class="dx-li">
//                 <slot str="你好 掘金！">
// 	                hello juejin!
//                 </slot>
//             </li>`,
//     data() {
// 		return {
// 	        todos:[
// 			    {id:1,a:true,text:"one"},
// 				{id:2,a:false,text:"one"},
// 			    {id:3,a:true,text:"one"},
// 			]
// 		}
// 	},
// 	beforeCreate() {
// 		console.log(this.todos);
// 	},
// 	mounted() {
// 		console.log(this.todos);
// 	}
// })

/*
const app = new Vue({
    el:"#app",
    template: `<ul>
               <my-li>
                 <span slot-scope="scope">
                      {{scope.str}}
                 </span>
               </my-li>
             </ul>`,
	data() {
		return {
		}
	}
});
*/
var compA = {
	template:"<div>I am {{whatIsMe}}</div>",
	data() {
		return {
            whatIsMe:"compA"
		}
	},
	methods:{
		bbb() {
			console.log("bbb");
		}
	},
	mounted() {
		console.log("componentA",this.$vnode.componentOptions.Ctor.options);
		console.log("this.$vnode.componentOptions.Ctor._base",this.$vnode.componentOptions.Ctor.options._base);
		console.log("this.$vnode.componentOptions.Ctor.options._base === Vue",this.$vnode.componentOptions.Ctor.options._base === Vue);
		console.log("this.$vnode.componentOptions.Ctor.super === Vue",this.$vnode.componentOptions.Ctor.super === Vue);
		console.log("compA",this);
	}
}



var abc = Vue.component("abc",{
	template:"<div><h2>{{t}}</h2>我是{{mes}}<comp-a></comp-a></div>",
	data() {
		return {
			mes:"abc",
			aaa:"aaa"
		}
	},
	props:["t"],
	components:{compA},
	methods:{
		abc() {console.log("abc")}
	},
	beforeUpdate() {
		console.log("beforeUpdate");
	},
	updated() {
        console.log("updated");
	},
	mounted() {
		console.log("abc",this);
		console.log("abc",this.constructor.options);
	}
})

// with(this){return _l((items),function(key){return _c('div',[_c('h2',[_v(_s(key))]),_c('abc'),_c('div',[_v(_s(info))]),(show)?_c('div',[_v("show")]):_e()],1)})}

app2 = new Vue({
	template:"<div><h2>123</h2><abc :t='titel'></abc><div>{{info}}</div><div v-if='show'>show</div></div>",
	data(){
		return {
			info:"root footer!",
	        items:["1","2","3"],
			show:true,
			titel:"i am title from parent"
		}
	}
});

app1 = new Vue({
	template:"<div><p v-for='key in items' ref='aaaa'></p></div>",
	data() {
		return {
			items:[1,2,3]
		}
	}
})

console.log(Vue.compile("<div><p v-for='key in items' ref='aaaa'></p></div>"));

app1.$mount(document.getElementById("app"));


var ndContainer = document.getElementById('list');
for (var i = 0; i < 3; i++) {
    var ndItem = document.createElement('li');
    ndItem.innerText = i + 1;
    ndItem.addEventListener('click', function () {
        alert(this.innerText);
    });
    ndContainer.appendChild(ndItem);
}
