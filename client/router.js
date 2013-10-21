Router.map(function() { 
  this.route('rumors', {path: '/'});
  this.route('rumor', {
    path: '/rumors/:_id',
    data: function() { 
      return Rumors.findOne(this.params._id); 
    }
  });
});