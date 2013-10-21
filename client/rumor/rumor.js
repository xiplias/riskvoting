Template.rumor.helpers({
  totalVotes: function () {
    return this.votes ? this.votes.length : 0;
  },
  voteStatus: function () {
    return _.contains(this.votes, Meteor.user()._id) ? 'Remove vote' : 'Vote';
  },
  avatar: function () {
    return avatar(this.toString());
  }
});

Template.rumor.events({
  'click #vote': function () {
    Meteor.call('toggleVote', this, function () {});
    console.log('vote');
  }
});
