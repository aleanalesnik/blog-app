function isPasswordValid(input){
  if (hasUpperCase(input) && hasLowerCase(input) && isLongEnough(input) && hasSpecialCharacter(input)){
  	input.setCustomValidity('The password is valid.');
  }
  if (!hasUpperCase(input)){
    input.setCustomValidity('The password needs a capital letter!');
  }
  if (!hasLowerCase(input)){
    input.setCustomValidity('The password needs a lowercase letter!');
  }
  if (!isLongEnough(input)){
    input.setCustomValidity('The password needs to between 8 characters or longer!');
  } else {
  	input.setCustomValidity('');
  }
}

function hasUpperCase(input){
  for (var i = 0; i < input.length; i++){
    if (input[i] === input[i].toUpperCase()){
      return true;
    }
  }
}
function hasLowerCase(input){
  for (var i = 0; i < input.length; i++){
    if (input[i] === input[i].toLowerCase()){
      return true;
    }
  }
}
function isLongEnough(input){
  if (input.length >= 8){
    return true;
  }
}

isPasswordValid('Password!');



// -------------------------------------------
// input(type='password', name='password', oninput="document.getElementById('confirm').pattern = this.value.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&')", required)

// Minimum eight characters, at least one letter and one number:
// "^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$"











