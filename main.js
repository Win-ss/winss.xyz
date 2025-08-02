document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px) scale(1.02)';
    });
    
    link.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});
const splashTexts = [
    "The fastest particle in the west!",
    "The fastest particle in the north!",
    "The fastest particle in the south!",
    "The fastest particle in the east!",
    "All thoroughly calculated.",
    "Is there another level of perfection upon perfection?",
    "A perfect algorithm. But is it?",
    "A perfect algorithm, one that can only exist in theory!",
    "Silence is a virtue.",
    "Code and Magic!",
    "Flint and steel!",
    "Chicken jockey!",
    "Make it happen!",
    "Let the overture begin.",
    "The future is now, old man!",
    "The moon cuts, clear and round, through the plum-coloured night.",
    "I know the moon, And this is an alien city.",
    "I stand in the window and watch the moon.",
    "One lives, while the other dies.",
    `Kinetic, chemical, nuclear... <br> What kind of energy will we harness next?`,
    `"Humans are capable of creating a total of 3.7x10^35 different smiles."`,
    "We only traveled together for a mere ten years",
    "They speak not to understand, but to deceive.",
    "At your command!",
    "Wait for... 5 seconds.",
    "Maximize the value of idiocy.",
    "4372617A796C696B656D65",
    "5465616D776F726B",
    "Making the most of bad ideas.",
    "Isn't it lovely... all alone?",
    "Heart made of glass, mind of stone.",
    "Making the invisible visible.",
    "Mirrored and refracted.",
    "It's cold before the world's collide.",
    "Can you see me in the dark?",
    "Hay una voz llamando",
    "Unearth the glass cocoon",
    "Kaleidoscope in bloom",
    "There is a world beyond our own<br>Where consciousness comparts",
    "The winds howl a wistful tune",
    "Nothing gold can stay",
    "Does it take ashes to rеmember fire?<br>  Thе smokey loss won't bring back desire",
    "It may be the start or the end<br>Its possibilities are decided by your imagination",
    "An illusion created for your triumph",
    "A set of swings blowing with the wind of time",
    "A castle made from glossed and chiselled quartz",
    "I have been patiently waiting in a cannon breathing gunpowder",
    "So did you hear about the other day?",
    "What do I do about this future sight?",
    "I always act but never listen.",
    "can we answer to the future’s call?",
    "I'm so sick of standing still",
    "The rain won't stop pouring down",
    "To that voice that never ends",
    "Oh time, our closest old friend. Where are you taking us?",
    "What's set in stone will disappear into thin air.",
    "Rearrange and negate",
    "pssst...<br> join it discord.gg/gx32kxa8nN",
];
function changeSplashText() {
    const randomSplashText = splashTexts[Math.floor(Math.random() * splashTexts.length)];
    document.getElementById('splash-text').innerHTML = randomSplashText;
}

const randomSplashText = splashTexts[Math.floor(Math.random() * splashTexts.length)];

document.getElementById('splash-text').innerHTML = randomSplashText;

document.addEventListener('click', (event) => {
    if (event.target.closest('.nav-link')) {
        return;
    }
    changeSplashText();
});
