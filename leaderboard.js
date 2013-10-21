// Set up a collection to contain rumor information. On the server,
// it is backed by a MongoDB collection named "rumors".

Rumors = new Meteor.Collection("rumors");

if (Meteor.isClient) {
  window.avatar = function (id) {
    return Meteor.users.findOne({_id: id}).avatar
  }

  Meteor.startup(function(){
    Hooks.init();
  });

  Hooks.onLoggedIn = function (userId) {
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

  Template.sidebar.votesLeft = function () {
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
}

// On server startup, create some rumors if the database is empty.
if (Meteor.isServer) {
  Meteor.publish(null, function () {
    return Meteor.users.find({}, {fields: { username: 1, profile: 1, voteCount: 1, isAdmin: 1, score: 1, avatar: 1}});
  });

  Meteor.methods({
    toggleVote: function (rumor) {
      var user = Meteor.user();
      var votes = rumor.votes || [];
      var voteCount = user.voteCount || 0;

      if (user && voteCount < 5 && !_.include(votes, user._id)) {
        votes.push(user._id);

        Rumors.update({_id: rumor._id}, {$set: { votes: votes }});
        Meteor.users.update({_id: user._id}, {$set: { voteCount: voteCount+1}})
        console.log('vote registered');
      } else {
        var count = votes.length;
        var votes = _.without(votes, user._id);

        if(votes.length < count) {
          Rumors.update({_id: rumor._id}, {$set: { votes: votes }});
          Meteor.users.update({_id: user._id}, {$set: { voteCount: voteCount-1}})
        }

        console.log('vote removed');
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
