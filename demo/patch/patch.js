const abc = {
    render(h) {
        return h('div',
        [h("div",[this.aaa || "no input"])])
    },
    props:{
        aaa:String
    }
}




const app = new Vue({
    data() {
        return {
            aaa:"This is from parent",
            //mes:"father"
        }
    },
    render(h) {
        return h("div",[h('abc',{attrs:{aaa:this.aaa}})]);
    },
    components:{abc}
});

app.$mount(document.querySelector('#app'));