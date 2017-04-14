'use strict';

(function( myService){

  if (typeof module !== 'undefined' && module.exports ) {
    module.exports = myService();
  } else if( angular) {
    angular.module('myApp')
      .factory('Combinatorics', function(){
        return myService();
      });
  } else {

    // Die?
    // window.myService = myService;
  }

}(function(){

  var addProperties = function(dst, src) {
    Object.keys(src).forEach(function(p) {
      Object.defineProperty(dst, p, {
        value: src[p],
        configurable: p == 'next'
      });
    });
  };
  var hideProperty = function(o, p) {
    Object.defineProperty(o, p, {
      writable: true
    });
  };
  var P = function(m, n) {
    var p = 1;
    while (n--) p *= m--;
    return p;
  };
  var C = function(m, n) {
    if (n > m) {
      return 0;
    }
    return P(m, n) / P(n, n);
  };
  var nextIndex = function(n) {
    var smallest = n & -n,
      ripple = n + smallest,
      new_smallest = ripple & -ripple,
      ones = ((new_smallest / smallest) >> 1) - 1;
    return ripple | ones;
  };


  var combination = function(ary, nelem, fun) {
    if (!nelem) nelem = ary.length;
    if (nelem < 1) throw new RangeError();
    if (nelem > ary.length) throw new RangeError();
    var first = (1 << nelem) - 1,
      size = C(ary.length, nelem),
      maxIndex = 1 << ary.length,
      sizeOf = function() {
        return size;
      },
      that = Object.create(ary.slice(), {
        length: {
          get: sizeOf
        }
      });
    hideProperty(that, 'index');
    addProperties(that, {
      valueOf: sizeOf,
      init: function() {
        this.index = first;
      },
      next: function() {
        if (this.index >= maxIndex) return;
        var i = 0,
          n = this.index,
          result = [];
        for (; n; n >>>= 1, i++) {
          if (n & 1) result[result.length] = this[i];
        }

        this.index = nextIndex(this.index);
        return (typeof (that._lazyMap) === 'function')?that._lazyMap(result):result;
      }
    });
    //addProperties(that, common);
    that.init();
    return (typeof (fun) === 'function') ? that.map(fun) : that;
  };

  return {
    combination:combination
  }
}));
