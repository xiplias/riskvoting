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
