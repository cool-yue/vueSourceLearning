console.log(123213213);
let  templa = "<div>{{comput}}</div>";
let app = new Vue({
	template:templa,
	data() {
		return {
			a:1,
			b:2,
			c:3,
			d:{b:{c:{a:1}}}
		}
	},
    computed:{
		comput() {
			console.log("计算属性运行");
			return this.a + this.b - this.c;
		}
	},
	watch:{
		comput:function(newValue,oldValue) {
			console.log("newValue comput",newValue);
			console.log("oldValue comput",oldValue);
		},
		"d.b.c.a":function(newValue,oldValue) {
			console.log("newValue a",newValue);
			console.log("oldValue a",oldValue);
		}
	}
});

app.$mount("#app");