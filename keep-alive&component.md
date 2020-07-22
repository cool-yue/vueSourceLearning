## component ##

    <component :is="aaa"></component> // template
    with(this){return _c(aaa,{tag:"component"})}// compiled

`component组件`的`render函数`首先在作用域中解析`aaa`的值，`aaa`表示为组件的名称，然后加一个组件属性`{tag:"component"}`,


## keep-alive ##

    <keep-alive><div></div></keep-alive> // template
    with(this){return _c('keep-alive',[_c('div')])} // compiled






## keep-alive + component组合缓存分析 ##

    <keep-alive><component :is='aaa' ></component></keep-alive> // template
    with(this){return _c('keep-alive',[_c(aaa,{tag:"component"})],1)}