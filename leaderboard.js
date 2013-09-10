// Set up a collection to contain rumor information. On the server,
// it is backed by a MongoDB collection named "rumors".

var avatar = function (id) {
  return Meteor.users.findOne({_id: id}).avatar
}

Rumors = new Meteor.Collection("rumors");

if (Meteor.isClient) {
  Meteor.startup(function(){
    Hooks.init();
  });

  Hooks.onLoggedIn = function (userId) {
    console.log("login")
    if(Meteor.user() && Meteor.user().avatar === undefined) {
      Meteor.call('updateAvatar', "http://www.gravatar.com/avatar/" + CryptoJS.MD5(Meteor.user().services.github.email));
    }
  }

  Template.leaderboard.users = function () {
    return Meteor.users.find({}, {sort: {score: -1}});
  }

  Template.leaderboard.avatar = function () {
    return avatar(this._id);
  }

  Template.content.votesLeft = function () {
    if(Meteor.user()) {
      return 5 - (Meteor.user().voteCount || 0);
    }
  }

  Template.rumors.hasMyVote = function () {
    if(Meteor.user()) {
      return _.include(this.votes, Meteor.user()._id);
    }
  }

  Template.rumors.rumors = function () {
    var rumors = Rumors.find({}).fetch();
    return _(rumors).sortBy(function (rumor) {
      return (rumor.votes || []).length;
    }).reverse();
  }

  Template.rumors.totalVotes = function () {
    return (this.votes || []).length
  }


  Template.addRumor.events({
    'click #rumor_submit': function (events) {
      console.log('test');
      if (Meteor.user().isAdmin && $('#rumor_name').val() !== "" && $('#rumor_risk').val() !== "") {
        Rumors.insert({
          name: $('#rumor_name').val(),
          risk: $('#rumor_risk').val()
        })

        $('#rumor_risk').val("");
        $('#rumor_name').val("");
      }

      return false;
    }
  });

  Template.rumors.isValidated = function () {
    return this.validated ? "Validated" : "";
  }

  Template.rumors.events({
    'click .rumor': function (event) {
      Meteor.call('toggleVote', this, function () {

      });

      return false;
    },
    'click .toggleConfirm': function (event) {
      Meteor.call('toggleValidate', this, function () {
      });

      return false;
    }
  });

  Template.rumors.avatar = function () {
    return avatar(this.toString());
  }

  Template.rumors.avatarName = function () {

    var user = Meteor.users.findOne({_id: this.toString()});

    if(user && user.profile) {
      return user.profile.name
    }
    
  }
}

// On server startup, create some rumors if the database is empty.
if (Meteor.isServer) {
  Meteor.publish(null, function () {
    return Meteor.users.find({}, {fields: { username: 1, profile: 1, voteCount: 1, isAdmin: 1, score: 1, avatar: 1}});
  });

  Meteor.methods({
    toggleVote: function (rumor) {
      if(Date.now() < 1378832890140) {
        var user = Meteor.user();
        var votes = rumor.votes || [];
        var voteCount = user.voteCount || 0;

        if (user && voteCount < 5 && !_.include(votes, user._id)) {
          votes.push(user._id);

          Rumors.update({_id: rumor._id}, {$set: { votes: votes }});
          Meteor.users.update({_id: user._id}, {$set: { voteCount: voteCount+1}})
        } else {
          var count = votes.length;
          var votes = _.without(votes, user._id);
          
          if(votes.length < count) {
            Rumors.update({_id: rumor._id}, {$set: { votes: votes }});
            Meteor.users.update({_id: user._id}, {$set: { voteCount: voteCount-1}})         
          }
        }
      } 
    },
    toggleValidate: function (rumor) {
      if(Meteor.user().isAdmin === true) {
        if(rumor.validated === true) {
          Rumors.update({_id: rumor._id}, {$set: { validated: false }});
        } else {
          Rumors.update({_id: rumor._id}, {$set: { validated: true }});
        }
      }
      console.log('va')
      Meteor.call('calculateScore');
    },
    calculateScore: function () {
      var scores = {}
      Rumors.find({validated: true}).forEach(function (rumor) {
        rumor.votes.forEach(function (vote) {
          scores[vote] = (scores[vote] || 0) + parseInt(rumor.risk); 
        });
      });

      if(_.size(scores) === 0) {
        Meteor.users.update({}, {$set: {score: 0}}, {multi: true})
      } else {
        _.each(scores, function(score, id) {
          console.log(id, score);
          Meteor.users.update({_id: id}, {$set: {score: score}});
        });
      }
    },
    updateAvatar: function (url) {
      console.log('avatar')
      Meteor.users.update({_id: Meteor.user()._id}, {$set: {avatar: url}});
    },
    massAvatarUpdate: function (go) {
      if(Meteor.user().isAdmin) {
        Meteor.users.find({}).forEach(function (user) {
          console.log(user.services.github.email, user._id, user.services.github.email || user._id);
          if(go) {
            Meteor.users.update({_id: user._id}, {$set: {avatar: "http://www.gravatar.com/avatar/" + CryptoJS.MD5(user.services.github.email || user._id)}});
          }
        });
      }
    }
  })
}
