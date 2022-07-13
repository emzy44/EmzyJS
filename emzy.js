(function(w){
	"use strict";
	
	// Emzy is a simple object with properties and functions
	// used like a tool by other scripts. It doesn't have to
	// be initialized before use, but several functions need
	// a quick configuration by setting some properties.
	// Please read the docs for more information.
	
	// In order to work properly, this script must be 
	// included in the <head> tag, whereas all the other 
	// scripts using Emzy must be placed just before or
	// just after the </body> tag.
	
	// local instanciation
	// will be finally sent as a global variable to window
	var Emzy = new Object();
	
	// configuration with default parameter values
	Emzy.params = {
		REGISTRY: {},
		TEMPLATE_BASEDIR: '',
		TEMPLATE_LIST: {},
		VIEW_CURRENT: null,
		VIEW_BASEDIR: '',
		VIEW_ELEMENT: 'body',
		VIEW_LIST: {},
		VIEW_DEFAULT: '',
		SEARCH_DELAY: 500,
		LOADING: null,
		URL_PARAMS: {}
	};
	
	// function : write()
	// insert an object into the registry
	// used in pair with read()
	// @name : the name of the object in the registry
	// @object : the object linked to the name
	Emzy.write = function(name, object){
		if(!name || typeof name != 'string'){
			console.warn('Emzy.write() needs a valid object name');
			return false;
		}
		this.params.REGISTRY[name] = object;
		return true;
	};
	
	// function : read()
	// return an object from the registry
	// used in pair with write()
	// @name : the name of the object in the registry
	Emzy.read = function(name){
		if(!name || typeof name != 'string'){
			console.warn('Emzy.read() needs a valid object name');
			return false;
		}
		return this.params.REGISTRY[name];
	};
	
	// function : erase()
	// delete an object from the registry
	// @name : the name of the object in the registry
	Emzy.erase = function(name){
		if(!name || typeof name != 'string'){
			console.warn('Emzy.erase() needs a valid object name');
			return false;
		}
		delete this.params.REGISTRY[name];
		return true;
	};
	
	// function : template()
	// get the content of a pre-loaded template
	// @name : the name of a TEMPLATE_LIST item
	// @data : optional data to inject into the template
	Emzy.template = function(name, data){
		if(!name || typeof name != 'string'){
			console.warn('Emzy.template() needs a valid template name');
			return false;
		}
		var t = this.params.TEMPLATE_LIST[name];
		if(!t){
			console.warn('Emzy.template() needs a valid template name');
			return false;
		}
		if(this.isEmpty(t.content)){
			console.warn('Emzy.template() : empty template');
			return false;
		}
		var content = t.content;
		if(this.isObject(data) && !this.isEmpty(data)){
			var keys = Object.keys(data);
			var regex = /({{)(.*?)(}})/g;
			var contentArray = content.split(regex).map(function(item, index, array){
				if(index != 0 && index != array.length-1){
					if(array[index-1] == '{{' && array[index+1] == '}}'){
						item = item.trim();
						var base = item.split('.')[0];
						var param = item.split('.')[1];
						if(keys.indexOf(base) != -1){
							if(data[item] !== undefined) return data[item];
							if(Emzy.isObject(data[base]) && !Emzy.isEmpty(data[base])){
								if(data[base][param] !== undefined) return data[base][param];
							}
						}
					}
				}
				return (item != '{{' && item != '}}' ? item : '');
			});
			content = contentArray.join('');
		}
		return content;
	};

	// function : view()
	// inject a view content into an HTML element
	// if no HTML element is specified, VIEW_ELEMENT is used
	// optionally inject a JavaScript controller into the <head> tag
	// or reload the controller function if already injected
	// @name : the name of a VIEW_LIST item
	// @args : optional parameters for the controller
	// @node : an optional HTML element selector
	Emzy.view = function(name, args, node){
		if(!name || typeof name != 'string'){
			console.warn('Emzy.view() needs a valid view name');
			return false;
		}
		var v = this.params.VIEW_LIST[name];
		if(!v){
			console.warn('Emzy.view() needs a valid view name');
			return false;
		}
		if(args && !this.isObject(args)){
			console.warn('Emzy.view() needs a valid object for controller parameters');
			return false;
		}
		if(node && typeof node != 'string'){
			console.warn('Emzy.view() needs a valid HTML element selecor');
			return false;
		}
		var element = null;
		if(!node){
			element = document.querySelector(this.params.VIEW_ELEMENT);
		} else {
			element = document.querySelector(node);
			if(!element || !Emzy.isElement(element)){
				console.warn('Emzy.view() needs a valid HTML element selector');
				return false;
			}
		}
		v.controllerArgs = args;
		var viewFile = this.params.VIEW_BASEDIR + v.view;
		var controllerFile = this.params.VIEW_BASEDIR + v.controller;
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function(){
			if(this.readyState === XMLHttpRequest.DONE){
				if(this.status == 200){
					element.innerHTML = this.responseText;
					Emzy.params.VIEW_CURRENT = name;
					if(v.controller){
						if(document.head.innerHTML.indexOf(controllerFile) == -1){
							var uniqueScriptId = Date.now() + Math.random();
							var script = document.createElement("script");
							script.src = controllerFile + '?' + uniqueScriptId;
							document.head.appendChild(script);
						} else {
							v.controllerFunction(v.controllerArgs);
						}
					}
				} else if(this.status == 404){
					element.innerHTML = '';
					console.warn('Emzy.view() did not find "' + viewFile + '"');
				} else console.warn('Emzy.view() : unexpected error');
			}
		}
		xhttp.open("GET", viewFile, true);
		xhttp.send();
		w.history.replaceState(null, null, w.location.pathname + '#/' + name);
		return true;
	};
	
	// function : controller()
	// link a controller to a view
	// executes the controller function for the first time
	// @name : the controller name, must match a VIEW_LIST item
	// @ctrlFunction : the controller content as a function
	Emzy.controller = function(name, ctrlFunction){
		if(!name || typeof name != 'string'){
			console.warn('Emzy.controller() needs a valid controller name');
			return false;
		}
		if(!ctrlFunction || typeof ctrlFunction != 'function'){
			console.warn('Emzy.controller() needs a valid controller function');
			return false;
		}
		var v = this.params.VIEW_LIST[name];
		if(!v){
			console.warn('Emzy.controller() needs a controller name that matches a view');
			return false;
		}
		this.scope = {};
		v.controllerFunction = ctrlFunction;
		v.controllerFunction(v.controllerArgs);
		return true;
	};
	
	// function : refresh()
	// reload the current view
	// in case of nested views, reload the base view
	Emzy.refresh = function(){
		if(!this.params.VIEW_CURRENT || this.params.VIEW_CURRENT == ''){ 
			return false;
		}
		this.view(this.params.VIEW_CURRENT.split('/')[0]);
		return true;
	};

	// function : get()
	// request data from a specified source
	// executes a callback function using the data
	// @path : path to the data source
	// @callback : a mandatory callback function
	Emzy.get = function(path, callback){
		if(!path || typeof path != 'string'){
			console.warn('Emzy.get() needs a valid file path');
			return false;
		}
		if(!callback || typeof callback != 'function'){
			console.warn('Emzy.get() needs a valid callback function');
			return false;
		}
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function(){
			if(this.readyState === XMLHttpRequest.DONE){
				if(this.status == 200){
					var response = this.responseText;
					try {
						response = JSON.parse(response);
					} catch(e){}
					callback(response);
				} else {
					Emzy.loading(false);
					if(this.status == 404){
						console.warn('Emzy.get() did not find "' + path + '"');
					} else console.warn('Emzy.get() : unexpected error ' + this.status); 
				}
			}
		}
		xhttp.open("GET", path, true);
		xhttp.send();
		return true;
	};
	
	// function : post()
	// send data to the server
	// executes a callback function using the data
	// @path : path to the destination
	// @data : the data to send
	// @callback : a mandatory callback function
	Emzy.post = function(path, data, callback){
		if(!path || typeof path !== 'string'){
			console.warn('Emzy.post() needs a valid file path');
			return false;
		}
		if(!callback || typeof callback !== 'function'){
			console.warn('Emzy.post() needs a valid callback function');
			return false;
		}
		if(!this.isObject(data)){
			console.warn('Emzy.post() needs a valid data object');
			return false;
		}
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function(){
			if(this.readyState === XMLHttpRequest.DONE){
				if(this.status === 200){
					var response = this.responseText;
					try {
						response = JSON.parse(response);
					} catch(e){}
					callback(response);
				} else {
					if(this.status == 404){
						console.warn('Emzy.post() did not find "' + path + '"');
					} else console.warn('Emzy.post() : unexpected error'); 
				}
			}
		}
		xhttp.open("POST", path, true);
		xhttp.setRequestHeader("Content-Type", "application/json");
		xhttp.send(JSON.stringify(data));
		return true;
	};
	
	// function : search()
	// search a string inside an HTML element
	// only its children containing the string remain visible
	// @node : the HTML element selector
	// @string : the search string
	Emzy.search = function(string, node){
		if(string === undefined || typeof string != 'string'){
			console.warn('Emzy.search() needs a valid search string');
			return false;
		}
		if(!node || typeof node != 'string'){
			console.warn('Emzy.search() needs a valid HTML element selector');
			return false;
		}
		var element = document.querySelector(node);
		if(!element || !Emzy.isElement(element)){
			console.warn('Emzy.search() needs a valid HTML element selector');
			return false;
		}
		if(this.searchTimeout) clearTimeout(this.searchTimeout);
		this.searchTimeout = setTimeout(function(){
			string = string.trim().toLowerCase();
			for(var i = 0; i < element.children.length; i++){
				element.children[i].classList.remove('emzy-display-none');
				if(element.children[i].innerText.toLowerCase().indexOf(string) == -1){
					element.children[i].classList.add('emzy-display-none');
				}
			};
		},this.params.SEARCH_DELAY);
		return true;
	};
	
	// function : loading()
	// start or stop the loading process
	// both start and stop actions must be defined as functions into the LOADING property
	// @bool : true to start, false to stop
	Emzy.loading = function(bool){
		if(!this.params.LOADING) return;
		if(typeof bool != 'boolean'){
			console.warn('Emzy.loading() needs a valid boolean value');
			return false;
		}
		this.params.LOADING[bool]();
		return true;
	};
	
	// function : remove()
	// delete an HTML element
	// @node : the HTML element or selector
	Emzy.remove = function(node){
		if(!node){
			console.warn('Emzy.remove() needs a valid HTML element or selector');
			return false;
		}
		var element = false;
		if(typeof node == 'string'){
			element = document.querySelector(node);
		} else {
			element = node;
		}
		if(!element || !Emzy.isElement(element)){
			console.warn('Emzy.remove() needs a valid HTML element or selector');
			return false;
		}
		element.parentNode.removeChild(element);
		return true;
	};
	
	// function : getURLParameters()
	// get the URL parameters
	Emzy.getURLParameters = function(){
		var params = {};
		var parser = document.createElement('a');
		parser.href = window.location.href;
		var query = parser.search.substring(1);
		if(query == '') return {};
		var vars = query.split('&');
		for(var i = 0; i < vars.length; i++) {
			var pair = vars[i].split('=');
			params[pair[0]] = decodeURIComponent(pair[1]);
		}
		this.params.URL_PARAMS = params;
		return params;
	};
	
	// function : getURLParameter()
	// get a parameter from the saved URL parameters
	// @name : the name of a parameter
	Emzy.getURLParameter = function(name){
		if(!name || typeof name != 'string'){
			console.warn('Emzy.getURLParameter() needs a valid string');
			return false;
		}
		return this.params.URL_PARAMS[name];
	};

	// function : isElement()
	// check if an object is an HTML element
	// @object : the object to check
	Emzy.isElement = function(object){
		return object instanceof Element || object instanceof HTMLDocument;  
	};
	
	// function : isArray()
	// check if an object is an array
	// @object : the object to check
	Emzy.isArray = function(object){
		if(!Array.isArray){
			Array.isArray = function(arg){
				return Object.prototype.toString.call(arg) === '[object Array]';
			};
		}
		return Array.isArray(object);
	};
	
	// function : isObject()
	// check if an object is really an object
	// @object : the object to check
	Emzy.isObject = function(object){
		return object === Object(object);
	};
	
	// function : isEmpty()
	// check if an object is empty
	// can be used on a string, array or object
	// @object : the object to check
	Emzy.isEmpty = function(object){ 
		if(object === undefined || object === null){ 
			return true;
		}
		if(typeof object === 'string' || this.isArray(object)){ 
			return !object.length;
		}
		if(Emzy.isObject(object)){
			for(var i in object){ 
				return false; 
			} 
			return true;
		}
	};
	
	// get the view name inside the URL, if any
	// it becomes our current view, loaded by Emzy on page load
	// make browser refresh page work
	Emzy.params.VIEW_CURRENT = w.location.hash.replace('#/','').split('/')[0];
	
	// get the parameters indide the URL
	// if any, no view is loaded on page load
	Emzy.params.URL_PARAMS = Emzy.getURLParameters();
	
	// on page load, do several things : 
	// - add a specific stylesheet used by Emzy
	// - load the templates specified in TEMPLATE_LIST
	// - load a view according to the URL : DEFAULT or CURRENT view
	//   => no view loaded if there are URL parameters
	w.onload = function(){
		var style = document.createElement('style');
		style.type = 'text/css';
		style.innerText = 
			'.emzy-display-none { ' +
				'display: none !important;' +
			'}';
		document.querySelector('head').appendChild(style);
		
		for(var template in Emzy.params.TEMPLATE_LIST){
			template = Emzy.params.TEMPLATE_LIST[template];
			template.content = '';
			var uniqueFileId = Date.now() + Math.random();
			var path = Emzy.params.TEMPLATE_BASEDIR + template.path + '?' + uniqueFileId;
			(function(template){
				Emzy.get(path, function(response){
					template.content = response;
				});
			}(template));
		}
		
		if(!Emzy.isEmpty(Emzy.params.VIEW_LIST)){
			if(Emzy.isEmpty(Emzy.params.URL_PARAMS)){
				if(!Emzy.params.VIEW_CURRENT || Emzy.params.VIEW_CURRENT == ''){
					Emzy.view(Emzy.params.VIEW_DEFAULT);
				} else Emzy.view(Emzy.params.VIEW_CURRENT);
			}
		}
	};
	
	// send Emzy as a global variable to window
	w.Emzy = Emzy;
	
}(window));