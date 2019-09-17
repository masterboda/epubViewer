// $(document).on('click', '.chapterPop', function(){

//     // $(".blackbolt").slideToggle();

// });

// $(document).on('click', '.closeBlack', function(){
//     // $(".blackbolt").slideToggle();
// });

$( ".chapterPop" ).click(function() {
  $(".blackbolt").slideDown().css("display","flex");
});

$( ".closeBlack" ).click(function() {
  $(".blackbolt").slideUp();
});

$( ".blackbolt" ).click(function() {
  $(".blackbolt").slideUp();
});




// document.getElementById("closeBlack").onclick = function() {

// alert("hola");

// };

/*$('.rangebar').mousemove(function (e) {
    relocateBar($(this));
});*/

/*$(document).on('change', '.rangebar', function (e) {
    actualpage = rendition.location.start.displayed.page;
    newpage = parseInt($(this).val());

    if(newpage > actualpage){
    	move = newpage - actualpage;
    	console.log(move);
    	rendition.next(move);
    }else if(newpage < actualpage){
    	move = actualpage - newpage;
    	console.log(move);
    	rendition.prev(move);
    }
});*/

function relocateBar(bar){

	var val = (bar.val() - bar.attr('min')) / (bar.attr('max') - bar.attr('min'));
    console.log(val);
    var percent = val * 100;
    console.log(percent);

    bar.css('background-image',
        '-webkit-gradient(linear, left top, right top, ' +
        'color-stop(' + percent + '%, #3d66ef), ' +
        'color-stop(' + percent + '%, #e6e6e6)' +
        ')');

    bar.css('background-image',
        '-moz-linear-gradient(left center, #3d66ef 0%, #3d66ef ' + percent + '%, #e6e6e6 ' + percent + '%, #e6e6e6 100%)');

}

$(document).on('click', '#tool2', function(){
	$('.glovo').toggle();
});

$(document).on('click', '.wd1 p', function(){
	$(".wd1 p").removeClass("glovo_selected");
	$(this).addClass("glovo_selected");
});
$(document).on('click', '.wd2 p', function(){
	$(".wd2 p").removeClass("glovo_selected");
	$(this).addClass("glovo_selected");
});
$(document).on('click', '.wd3 p', function(){
	$(".wd3 p").removeClass("glovo_selected");
	$(this).addClass("glovo_selected");
});
$(document).on('click', '.wd4 p', function(){
	$(".wd4 p").removeClass("glovo_selected");
	$(this).addClass("glovo_selected");
});

// size="";

// function getSize() {
//   size = $( ".Texto-fondo" ).css( "font-size" );
//   size = parseInt(size, 10);
//   // console.log(size);

//   // $( "#font-size" ).text(  size  );
// }

//get inital font size


// $( "#up" ).on( "click", function() {

//   // parse font size, if less than 50 increase font size
//   if ((size + 2) <= 50) {
//     $( "h1" ).css( "font-size", "+=2" );
//     $( "#font-size" ).text(  size += 2 );
//   }
// });

// $( "#down" ).on( "click", function() {
//   if ((size - 2) >= 12) {
//     $( "h1" ).css( "font-size", "-=2" );
//     $( "#font-size" ).text(  size -= 2  );
//   }
// });






