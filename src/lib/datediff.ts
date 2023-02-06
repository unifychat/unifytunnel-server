export var DateDiff = {
 
  inDays: function(d1: Date, d2: Date) {
      var t2 = d2.getTime();
      var t1 = d1.getTime();

      return Math.floor((t2-t1)/(24*3600*1000));
  },

  inWeeks: function(d1: Date, d2: Date) {
      var t2 = d2.getTime();
      var t1 = d1.getTime();

      return ~~((t2-t1)/(24*3600*1000*7));
  },

  inMonths: function(d1: Date, d2: Date) {
      var d1Y = d1.getFullYear();
      var d2Y = d2.getFullYear();
      var d1M = d1.getMonth();
      var d2M = d2.getMonth();

      return (d2M+12*d2Y)-(d1M+12*d1Y);
  },

  inYears: function(d1: Date, d2: Date) {
      return d2.getFullYear()-d1.getFullYear();
  }
}