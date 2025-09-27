let title = 'Spotlight'; // Title of the slideshow TBD
let listFileName = 'list.txt'; // Name of the file containing the list of movie IDs
let moviesSeriesBoth = 3; // 1 for movies, 2 for series, 3 for both
let shuffleInterval = 15000; // Time in milliseconds before the next slide is shown, unless trailer is playing
let useTrailers = true; // Set to false to disable trailers
let setRandomMovie = true; // Set to false to disable random movie selection from the list
let showOnOtherPages = false; // Set to true to show the slideshow on all pages eg. favorites tab, requests tab, etc.
let showTitle = false; // Set to true to place the slideshow title above the banner
let disableTrailerControls = false; // Set to false to enable trailer controls
let setMutedHover = true; // Set to false to disable unmuting the video on hover
let unmutedVolume = 20; // Set the volume level when the video is unmuted
let useSponsorBlock = true; // Set to true to use SponsorBlock data to skip intro/outro segments of trailers
let skipIntro = true; // Set to true to skip the intro segment of the trailer
let plotMaxLength = 550; // Maximum number of characters in the plot
let trailerMaxLength = 0; // Default value 0; length measured in ms, set to 0 to disable, could be used instead of SponsorBlock
let startTrailerMuted = true; // Default value true; set to false to start the video unmuted

// Seasonal lists configuration
let useSeasonalLists = false; // Set to true to enable automatic seasonal list switching
const seasonalLists = {
    spring: 'spring_list.txt',        // spring (march-may)
    summer: 'summer_list.txt',        // summer (june-august)
    autumn: 'autumn_list.txt',        // autumn (september-november)
    winter: 'winter_list.txt',        // winter (december-february)
    newyear: 'newyear_list.txt',      // new year (1.-7. januar)
    valentine: 'valentine_list.txt',   // valentines day (10.-20. februar)
    easter: 'easter_list.txt',        // easter (variable dates, March-April)
    halloween: 'halloween_list.txt'   // halloween (20.-31. october)
};


// Language specific strings
// currently implemented: en, de, fr, es, it, pl, nl
const seasonTerms = ["Season", "Staffel", "Saison", "Temporada", "Stagione", "Sezon", "Seizoen"];
const seasonsTerms = ["Seasons", "Staffeln", "Saisons", "Temporadas", "Stagioni", "Sezony", "Seizoenen"];
const unknownSeasonsTerms = ["Unknown seasons", "Unbekannte Staffeln","Saisons inconnues", "Temporadas desconocidas", "Stagioni sconosciute", "Nieznane sezony", "Onbekende seizoenen"];
const movieTerms = ["Movie", "Film", "Film", "Película", "Film", "Film", "Film"];
const moviesTerms = ["Movies", "Filme", "Films", "Películas", "Film", "Filmy", "Films"];
const unknownMoviesTerms = ["Unknown movies", "Unbekannte Filme", "Films inconnus", "Películas desconocidas", "Film sconosciuti", "Nieznane filmy", "Onbekende films"];
const unknownYearTerms = ["Unknown year", "Unbekanntes Jahr", "Année inconnue", "Año desconocido", "Anno sconosciuto", "Nieznany rok", "Onbekend jaar"];
const unknownRuntimeTerms = ["Unknown Runtime", "Unbekannte Länge", "Durée inconnue", "Duración desconocida", "Durata sconosciuta", "Nieznany czas trwania", "Onbekende duur"];

// get the Jellyfin credentials from the local storage (api token and user id)
const getJellyfinCredentials = () => {
    const jellyfinCreds = localStorage.getItem("jellyfin_credentials");
  
    try {
      const serverCredentials = JSON.parse(jellyfinCreds);
  
      const firstServer = serverCredentials.Servers[0];
  
      if (!firstServer) {
        console.error("Could not find credentials for the client");
        return;
      }
  
      return { token: firstServer.AccessToken, userId: firstServer.UserId };
    } catch (e) {
      console.error("Could not parse jellyfin credentials", e);
    }
  };

const { token, userId } = getJellyfinCredentials();


// variables
let isChangingSlide = false, player = null, slideChangeTimeout = null, isHomePageActive = false;
let currentLocation = window.top.location.href;
let movieList = [], currentMovieIndex = 0;
let previousMovies = [];
let forwardMovies = [];
let monitorOutroInterval = null; // Global interval variable to monitor the outro segment of the trailer
let isMuted = startTrailerMuted; userInteracted = false;
const baseBackdropOverlapVW = 11.4;
let activeTrailerLayout = null;


// Get the current browser language
const getBrowserLanguage = () => {
    const language = navigator.language || navigator.userLanguage;
    return language.split('-')[0]; // Return the language code (e.g., 'en', 'de')
};
const browserLanguage = getBrowserLanguage();

// set corresponding language index
const setLanguage = (language) => {
    switch (language) {
        case 'de':
            return 1;
        case 'fr':
            return 2;
        case 'es':
            return 3;
        case 'it':
            return 4;
        case 'pl':
            return 5;
        case 'nl':
            return 6;
        default:
            return 0;
    }
};

const languageIndex = setLanguage(browserLanguage);

// Seasonal list detection
const getCurrentSeason = () => {
    if (!useSeasonalLists) {
        return null;
    }
    
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day = now.getDate();
    
    // Special events (take precedence over seasons)
    // new year: 1-7 january
    if (month === 1 && day <= 7) return 'newyear';
    
    // valentines day: 10-20 february
    if (month === 2 && day >= 10 && day <= 20) return 'valentine';
    
    // halloween: 20-31 cotober
    if (month === 10 && day >= 20) return 'halloween';
    
    // Easter calculation (simplified - around March-April)
    const easterStart = getEasterPeriod(now.getFullYear());
    if (isInEasterPeriod(now, easterStart)) return 'easter';
    
    // Regular seasons
    if (month >= 3 && month <= 5) return 'spring';     // march-may
    if (month >= 6 && month <= 8) return 'summer';     // june-august
    if (month >= 9 && month <= 11) return 'autumn';    // september-november
    if (month === 12 || month <= 2) return 'winter';   // december-february
    
    return null;
};

// Simplified Easter calculation (Western Easter)
const getEasterPeriod = (year) => {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    
    return { month, day };
};

// Check if current date is in Easter period (2 weeks around Easter)
const isInEasterPeriod = (currentDate, easter) => {
    const easterDate = new Date(currentDate.getFullYear(), easter.month - 1, easter.day);
    const timeDiff = Math.abs(currentDate.getTime() - easterDate.getTime());
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff <= 7; // 1 week before and after Easter
};

// Get the appropriate list filename based on season
const getSeasonalListFileName = async () => {
    const season = getCurrentSeason();
    if (!season || !seasonalLists[season]) {
        console.log('Using default list:', listFileName);
        return listFileName;
    }
    
    // Check if seasonal file exists
    const seasonalFile = seasonalLists[season];
    try {
        const response = await fetch(seasonalFile + '?' + new Date().getTime(), { method: 'HEAD' });
        if (response.ok) {
            console.log(`Using seasonal list for ${season}:`, seasonalFile);
            return seasonalFile;
        } else {
            console.warn(`Seasonal file ${seasonalFile} not found, falling back to default list:`, listFileName);
            return listFileName;
        }
    } catch (error) {
        console.warn(`Error checking seasonal file ${seasonalFile}:`, error.message, '- falling back to default list:', listFileName);
        return listFileName;
    }
};

// Get SponsorBlock-Data for the outro/intro segment of the trailer
const fetchSponsorBlockData = async (videoId) => {
    try {
        const response = await fetch(`https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&categories=["intro","outro"]`);
        const segments = await response.json();

        let intro = null;
        let outro = null;

        segments.forEach(segment => {
            if (segment.category === "intro" && Array.isArray(segment.segment)) {
                intro = segment.segment; // [start, end] of the intro
            } else if (segment.category === "outro" && Array.isArray(segment.segment)) {
                outro = segment.segment; // [start, end] of the outro
            }
        });
        return { intro, outro };
    } catch (error) {
        console.error('Error fetching SponsorBlock data:', error);
        return { intro: null, outro: null };

    }
};


// Monitor the video player for the outro segment
function monitorOutro(player, outroSegment) {
    if (monitorOutroInterval) { // Clear the interval if it's already running
        clearInterval(monitorOutroInterval);
    }

    monitorOutroInterval = setInterval(() => {
        if (!outroSegment || !player) {
            console.log('Invalid outro segment or player not initialized');
            clearInterval(monitorOutroInterval);
            return;
        }

        const currentTime = player.getCurrentTime();
        if (currentTime >= outroSegment[0] && currentTime < outroSegment[1]) {
            clearInterval(monitorOutroInterval);
            player.stopVideo(); // stop video
            setTimeout(fetchRandomMovie, 100); // fetch next movie
        }
    }, 500); // check every 500ms
}

const clearMonitorOutroInterval = () => {
    if (monitorOutroInterval) {
        clearInterval(monitorOutroInterval);
        monitorOutroInterval = null;
    }
};


const createElem = (tag, className, textContent, src, alt) => {
    const elem = document.createElement(tag);
    if (className) elem.className = className;
    if (textContent) elem.textContent = textContent;
    if (src) elem.src = src;
    if (alt) elem.alt = alt;
    return elem;
};

// Check for screen size below 1000px
function isMobile() {
    return window.innerWidth <= 1000;
}

const truncateText = (text, maxLength) => text.length > maxLength ? text.substr(0, maxLength) + '...' : text;

const cleanup = () => {
    clearTrailerLayout();
    if (player && typeof player.destroy === 'function') {
        player.destroy();
    }
    player = null;
    clearTimeout(slideChangeTimeout);
    slideChangeTimeout = null;
    clearMonitorOutroInterval();
    const container = document.getElementById('slides-container');
    if (container) container.innerHTML = '';
};

const clearTrailerLayout = () => {
    if (!activeTrailerLayout) {
        return;
    }

    const { videoContainer, backdrop, plot, genres, loremIpsum, logo } = activeTrailerLayout;

    if (videoContainer) {
        videoContainer.style.removeProperty('width');
    }

    if (backdrop) {
        backdrop.style.removeProperty('width');
        backdrop.style.removeProperty('left');
    }

    if (plot) {
        plot.style.removeProperty('left');
        plot.style.removeProperty('max-width');
    }

    if (genres) {
        genres.style.removeProperty('left');
    }

    if (loremIpsum) {
        loremIpsum.style.removeProperty('left');
    }

    if (logo) {
        logo.style.removeProperty('left');
    }

    activeTrailerLayout = null;
};

const applyTrailerLayout = (videoContainer) => {
    if (!videoContainer) {
        return;
    }

    if (activeTrailerLayout && activeTrailerLayout.videoContainer !== videoContainer) {
        clearTrailerLayout();
    }

    const slideWrapper = videoContainer.closest('.slide-wrapper');
    if (!slideWrapper) {
        return;
    }

    const slideElement = slideWrapper.querySelector('.slide');
    const containerRect = videoContainer.getBoundingClientRect();
    const slideRect = slideElement ? slideElement.getBoundingClientRect() : null;
    const effectiveHeight = containerRect.height || (slideRect ? slideRect.height : 0);
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1920;

    if (!effectiveHeight || !viewportWidth) {
        return;
    }

    const idealWidthVw = (effectiveHeight * (16 / 9)) / viewportWidth * 100;
    const videoWidthVw = Math.max(idealWidthVw, 18);
    const videoWidthVwCapped = Math.min(videoWidthVw, 34.4);
    const videoWidthVwRounded = Math.min(Math.max(videoWidthVwCapped, 10), 60);

    const backdrop = slideWrapper.querySelector('.backdrop');
    const plot = slideWrapper.querySelector('.plot');
    const genres = slideWrapper.querySelector('.genres');
    const loremIpsum = slideWrapper.querySelector('.lorem-ipsum');
    const logo = slideWrapper.querySelector('.logo');

    videoContainer.style.width = `${videoWidthVwRounded.toFixed(3)}vw`;

    if (backdrop) {
        const backdropGap = Math.max(videoWidthVwRounded - baseBackdropOverlapVW, 0).toFixed(3);
        backdrop.style.width = `calc(100% - ${backdropGap}vw)`;
        backdrop.style.left = '0';
    }

    if (plot) {
        const availableAreaVw = Math.max(100 - videoWidthVwRounded, 20);
        const maxWidth = Math.max(availableAreaVw - 4, 30).toFixed(3);
        plot.style.left = `calc(50% - ${(videoWidthVwRounded / 2).toFixed(3)}vw)`;
        plot.style.maxWidth = `${maxWidth}vw`;
    }

    const anchorShift = `calc(50% - ${(videoWidthVwRounded / 2).toFixed(3)}vw)`;
    if (genres) {
        genres.style.left = anchorShift;
    }

    if (loremIpsum) {
        loremIpsum.style.left = anchorShift;
    }

    if (logo) {
        logo.style.left = anchorShift;
    }

    activeTrailerLayout = {
        videoContainer,
        backdrop,
        plot,
        genres,
        loremIpsum,
        logo
    };
};

window.addEventListener('resize', () => {
    if (activeTrailerLayout && document.contains(activeTrailerLayout.videoContainer)) {
        applyTrailerLayout(activeTrailerLayout.videoContainer);
    } else {
        activeTrailerLayout = null;
    }
});

const createSlideElement = (movie, hasVideo = false) => {
    cleanup();
    isMuted = startTrailerMuted;
    const container = document.getElementById('slides-container');
    const slideWrapper = createElem('div', 'slide-wrapper');
    const slide = createElem('div', 'slide');

    if (movie && (!previousMovies.length || previousMovies[previousMovies.length - 1].Id !== movie.Id)) {
        previousMovies.push(movie);
    }

    if (previousMovies.length > 50) {
        previousMovies.shift();
    }
    ['backdrop', 'logo'].forEach(type => slide.appendChild(createElem('img', type, null, `/Items/${movie.Id}/Images/${type.charAt(0).toUpperCase() + type.slice(1)}${type === 'backdrop' ? '/0' : ''}`, type)));

    if (showTitle && title) {
        const heading = createElem('div', 'heading', title);
        heading.style.display = 'flex';
        slideWrapper.classList.add('has-heading');
        slideWrapper.appendChild(heading);
    }

    const textContainer = createElem('div', 'text-container');
    const premiereYear = movie.PremiereDate ? new Date(movie.PremiereDate).getFullYear() : unknownYearTerms[languageIndex];

    let additionalInfo;
    if (movie.Type === 'Series') {
        additionalInfo = movie.ChildCount
            ? `${movie.ChildCount} ${movie.ChildCount > 1 ? seasonsTerms[languageIndex] : seasonTerms[languageIndex]}`
            : unknownSeasonsTerms[languageIndex];
    } else if (movie.Type === 'BoxSet') {
        additionalInfo = movie.ChildCount
            ? `${movie.ChildCount} ${movie.ChildCount > 1 ? moviesTerms[languageIndex] : movieTerms[languageIndex]}`
            : unknownMoviesTerms[languageIndex];
    } else {
        additionalInfo = movie.RunTimeTicks
            ? `${Math.round(movie.RunTimeTicks / 600000000)} min`
            : unknownRuntimeTerms[languageIndex];
    }

    let loremText = `
				<span style="background: transparent; padding-left: 0.5em; padding-right: 0.5em; padding-top: 0.05em; padding-bottom: 0.05em; margin-left: 1em;">${additionalInfo}</span> 
				<span style="background: transparent; padding-left: 0.5em; padding-right: 0.5em; padding-top: 0.05em; padding-bottom: 0.05em; margin-left: 1em;">${premiereYear}</span> `;

    if (movie.CommunityRating) {
        loremText += `<span style="background: transparent; padding-left: 0.5em; padding-right: 0.5em; padding-top: 0.05em; padding-bottom: 0.05em; margin-left: 1em;">
				<i class="star-icon fas fa-star"></i> ${movie.CommunityRating.toFixed(1)}
				</span> `;
    }
    if (movie.CriticRating) {
        loremText += `<span style="background: transparent; padding-left: 0.5em; padding-right: 0.5em; padding-top: 0.05em; padding-bottom: 0.05em; margin-left: 1em;">
				<img src="https://i.imgur.com/aoLXyXx.png" alt="Rotten Tomatoes" style="width: 1.05em; height: 1.25em; font-size: 0.83em; padding-right: 0.4em; margin-left: -0.1em; vertical-align: middle; padding-bottom: 0.3em;">  
				${movie.CriticRating}%</span>`;
    }

    // Age Rating

    const ageRating = movie.OfficialRating ? movie.OfficialRating : 'NR';
    const ratingClass = ageRating.toLowerCase().replace(/ /g, '-');

    const ageRatingDiv = createElem('div', 'age-rating');
    const ageRatingSpan = createElem('span', ratingClass, ageRating);
    ageRatingSpan.style.cssText = 'border: 0.09em solid currentColor; border-radius: .1em; padding: 0.2em; padding-top: 0.125em; padding-bottom: 0.26em; display: inline-block; text-align: center; line-height: 0.8em;';
    ageRatingDiv.appendChild(ageRatingSpan);
    slide.appendChild(ageRatingDiv);

    // Genres Section
    const genresDiv = createElem('div', 'genres');
    if (movie.Genres && movie.Genres.length > 0) {
        movie.Genres.forEach((genre, index) => {
            const genreElem = createElem('span', 'genre-item');
            genreElem.textContent = genre;
            genreElem.style.backgroundColor = 'transparent';
            genreElem.style.paddingLeft = '0.5em';
            genreElem.style.paddingRight = '0.5em';
            genreElem.style.paddingTop = '0.1em';
            genreElem.style.paddingBottom = '0.1em';
            genreElem.style.color = 'white';
            genreElem.style.borderRadius = '0em';
            genreElem.style.marginRight = '0em';
            genresDiv.appendChild(genreElem);

            if (index < movie.Genres.length - 1) {
                const separator = createElem('span', 'material-symbols-outlined');
                separator.textContent = 'stat_0'; // The separator symbol
                genresDiv.appendChild(separator);
            }
        });
    } else {
        genresDiv.textContent = 'Genres: N/A';
    }
    slide.appendChild(genresDiv);

    const loremDiv = createElem('div', 'lorem-ipsum');
    loremDiv.innerHTML = loremText;
    textContainer.appendChild(loremDiv);
    textContainer.appendChild(createElem('div', 'plot', truncateText(movie.Overview, plotMaxLength)));
    slide.appendChild(textContainer);

    const backButton = createElem('div', 'back-button');
    const backIcon = createElem('i', 'material-icons');
    backIcon.textContent = 'chevron_left';
    backButton.appendChild(backIcon);
    backButton.onclick = (e) => {
        e.stopPropagation();
        navigateBack();
    };

    // Skip button logic
    const skipButton = createElem('div', 'skip-button');
    const skipIcon = createElem('i', 'material-icons');
    skipIcon.textContent = 'chevron_right';
    skipButton.appendChild(skipIcon);
    skipButton.onclick = (e) => {
        e.stopPropagation();
        navigateForward();
    };

    slide.appendChild(backButton);
    slide.appendChild(skipButton);

    // Create Details buttons
    const buttonsContainer = createElem('div', 'buttons-container');

    // Details Button
    const detailsButton = createElem('button', 'details-button');
    const playIcon = createElem('i', 'fas fa-play');
    detailsButton.appendChild(playIcon);
    detailsButton.appendChild(document.createTextNode(' Play'));
    detailsButton.onclick = (e) => {
        e.stopPropagation();
        window.top.location.href = `/#!/details?id=${movie.Id}`; // Navigate to details page
    };

    // Append buttons to the container
    buttonsContainer.appendChild(detailsButton);
    slide.appendChild(buttonsContainer);

    const overlay = createElem('div', 'clickable-overlay');
    overlay.onclick = () => window.top.location.href = `/#!/details?id=${movie.Id}`;
    slide.appendChild(overlay);

    if (hasVideo && movie.RemoteTrailers && movie.RemoteTrailers.length > 0) {
        const trailerUrl = movie.RemoteTrailers[0].Url;
        const watchTrailerButton = createElem('button', 'watch-trailer-button');
        const trailerIcon = document.createElement('i');
        trailerIcon.className = 'fas fa-film';
        watchTrailerButton.appendChild(trailerIcon);
        watchTrailerButton.appendChild(document.createTextNode('Trailer'));

        watchTrailerButton.onclick = (e) => {
            e.stopPropagation();
            if (isMobile()) {
                // Show the video in an overlay for mobile
                showVideoOverlay(trailerUrl);
            } else {
                // Open the trailer in a new tab for desktop
                window.open(trailerUrl, '_blank');
            }
        };

        buttonsContainer.appendChild(watchTrailerButton);
    }

    if (useTrailers && hasVideo && movie.RemoteTrailers?.length > 0) {
        const videoId = new URL(movie.RemoteTrailers[0].Url).searchParams.get('v');
        const videoContainer = createElem('div', 'video-container');
        const videoElement = createElem('div', 'video-player');
        videoContainer.appendChild(videoElement);
        slide.appendChild(videoContainer);

        player = new YT.Player(videoElement, {
            height: '100%',
            width: '100%',
            videoId,
            playerVars: {
                mute: isMuted ? 1 : 0, // Mute the video
                controls: disableTrailerControls ? 0 : 1,    // Hide the controls
                disablekb: 1,   // Disable keyboard controls
                iv_load_policy: 3, // Disable annotations
                cc_load_policy: 3, // Disable captions
            },
            events: {
                'onReady': () => {
                    if (useSponsorBlock) {
                        fetchSponsorBlockData(videoId).then(({ intro, outro }) => {
                            if (intro && skipIntro) {
                                console.log(`SponsorBlock intro segment: Start - ${intro[0]}s, End - ${intro[1]}s`);
                                if (player && typeof player.seekTo === 'function') {
                                    player.seekTo(intro[1], true);
                                }
                            } else {
                                console.log('No intro segment found/provided or intro skipping is disabled');
                            }

                            if (outro) {
                                console.log(`SponsorBlock outro segment: Start - ${outro[0]}s, End - ${outro[1]}s`);
                                monitorOutro(player, outro);
                            } else {
                                console.log('No outro segment found/provided');
                            }
                        }).catch(error => {
                            console.error('Error reading SponsorBlock data:', error);
                        });
                    }
                    if (trailerMaxLength > 0) {
                        clearTimeout(slideChangeTimeout);
                        slideChangeTimeout = setTimeout(() => {
                            clearMonitorOutroInterval();
                            if (player) {
                                player.stopVideo();
                                player.destroy();
                                player = null;
                            }
                            fetchRandomMovie();
                        }, trailerMaxLength);
                    }
                    if (isMuted) {
                        player.mute(); // Mute the video if the setting is MuteOn
                    } else {
                        player.unMute();
                    }

                    player.playVideo();
                    player.setVolume(unmutedVolume); // Set the volume, value between 0 and 100
                    console.log(`Playing trailer for '${movie.Name}'`);
                },
                'onStateChange': (event) => {
                    if (event.data === YT.PlayerState.PLAYING) {
                        applyTrailerLayout(videoContainer);
                    } else if (event.data === YT.PlayerState.ENDED) {
                        clearTrailerLayout();
                        clearMonitorOutroInterval();
                        setTimeout(fetchRandomMovie, 20);
                    }
                },
                'onError': () => {
                    console.error(`YouTube prevented playback of '${movie.Name}'`);
                    if (player) {
                        clearMonitorOutroInterval();
                        player.destroy();
                        player = null;
                    }

                    clearTrailerLayout();
                    videoContainer.style.width = '0';

                    startSlideChangeTimer();
                }
            }
        });

    } else {
        startSlideChangeTimer();
    }


    slideWrapper.appendChild(slide);

    container.innerHTML = '';
    container.appendChild(slideWrapper);
};

function addSwipeListeners(slide) {
    let startX, startY, distX, distY;
    const threshold = 50;
    const restraint = 100;

    slide.addEventListener('touchstart', e => {
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
    });

    slide.addEventListener('touchmove', e => {
        const touch = e.touches[0];
        distX = touch.clientX - startX;
        distY = touch.clientY - startY;
    });

    slide.addEventListener('touchend', () => {
        if (Math.abs(distX) > threshold && Math.abs(distY) < restraint) {
            if (distX > 0) {
                console.log('Swipe Right');
            } else {
                console.log('Swipe Left');
                fetchRandomMovie();
            }
        }
        distX = distY = 0;
    });
}

const navigateBack = () => {
    if (previousMovies.length < 2) {
        console.log("No previous slides in history.");
        return;
    }

    const currentMovie = previousMovies.pop();
    forwardMovies.unshift(currentMovie);

    const previousMovie = previousMovies[previousMovies.length - 1];
    createSlideElement(previousMovie, true);
};

const navigateForward = () => {
    if (forwardMovies.length === 0) {
        console.log("No forward slides in history.");
        fetchRandomMovie();
        return;
    }

    const currentMovie = forwardMovies.shift();
    previousMovies.push(currentMovie);


    createSlideElement(currentMovie, true);
};

// Show the video overlay
function showVideoOverlay(trailerUrl) {
    const videoOverlay = document.getElementById('video-overlay');
    const videoFrame = document.getElementById('trailer-video');
    const closeOverlay = document.getElementById('close-overlay');

    // Extract video ID from trailer URL
    const videoId = new URL(trailerUrl).searchParams.get('v');
    const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;

    // Set iframe's source to trailer URL
    videoFrame.src = embedUrl;

    // Show the overlay
    videoOverlay.style.display = 'block';

    // Pause the slide timer when the video overlay is open
    clearSlideChangeTimeout();

    // Close the overlay when the X is clicked
    closeOverlay.onclick = () => {
        videoOverlay.style.display = 'none';
        videoFrame.src = '';  // Stop the video
    };

    // Close the overlay when clicking outside content
    window.onclick = (event) => {
        if (event.target === videoOverlay) {
            videoOverlay.style.display = 'none';
            videoFrame.src = '';
        }
    };
}

// Close video overlay and restart slide timer
function closeVideoOverlay() {
    const videoOverlay = document.getElementById('video-overlay');
    const videoFrame = document.getElementById('trailer-video');

    // Hide overlay
    videoOverlay.style.display = 'none';

    // Reset the iframe source
    videoFrame.src = '';

    // Restart slide change timer when video overlay is closed
    startSlideChangeTimer();
}

function clearSlideChangeTimeout() {
    if (slideChangeTimeout) {
        clearTimeout(slideChangeTimeout);
        slideChangeTimeout = null;
    }
}

const startSlideChangeTimer = () => { clearTimeout(slideChangeTimeout); slideChangeTimeout = setTimeout(fetchRandomMovie, shuffleInterval); };

const checkBackdropAndLogo = movie => {
    Promise.all(['/Images/Backdrop/0', '/Images/Logo'].map(url =>
        fetch(`/Items/${movie.Id}${url}`, { method: 'HEAD' }).then(response => response.ok)
    )).then(([backdropExists, logoExists]) =>
        backdropExists && logoExists ? createSlideElement(movie, true) : fetchRandomMovie()
    ).catch(() => fetchRandomMovie());
};

const readCustomList = async () => {
    const currentListFile = await getSeasonalListFileName();
    return fetch(currentListFile + '?' + new Date().getTime())
        .then(response => response.ok ? response.text() : null)
        .then(text => {
            if (!text || !text.trim()) {
                console.warn('List.txt is empty or could not be loaded.');
                return null; // Fallback to random selection
            }
            const lines = text.split('\n').filter(Boolean);

            const firstLine = lines.shift().trim();
            const tokens = firstLine.split(/\s+/).filter(Boolean);

            let muteSetting = null;
            if (tokens.length > 0) {
                const lastToken = tokens[tokens.length - 1].toLowerCase();
                if (lastToken === 'muteon' || lastToken === 'muteoff') {
                    muteSetting = lastToken;
                    tokens.pop();
                }
            }

            const parsedTitle = tokens.join(' ').trim();
            if (parsedTitle) {
                title = parsedTitle;
            }

            if (muteSetting) {
                startTrailerMuted = muteSetting === 'muteon';
            }

            isMuted = startTrailerMuted;

            // Remaining lines are media IDs
            const mediaList = lines.map(line => line.trim().substring(0, 32));
            if (setRandomMovie) {
                return shuffleArray(mediaList); // Shuffle the list before returning it if set
            }
            return mediaList; // return exact list
        })
        .catch(() => {
            console.error('Error reading List.txt. Falling back to random selection.');
            return null;
        });
};


const fetchRandomMovie = () => {
    if (isChangingSlide) return;
    isChangingSlide = true;

    if (movieList.length === 0) {
        readCustomList().then(list => {
            if (list && list.length > 0) {
                movieList = list;
                currentMovieIndex = 0;
                fetchNextMovie();
            } else {
                console.warn("Fallback to random selection.");
                fetchNextMovie(true);
            }
        });
    } else {
        fetchNextMovie();
    }
};

const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

const fetchNextMovie = (useRandom = false) => {
    if (!userId) {
        console.error('Could not retrieve the current user ID.');
        isChangingSlide = false;
        return;
    }

    const headers = { 'Authorization': `MediaBrowser Client="Jellyfin Web", Device="YourDeviceName", DeviceId="YourDeviceId", Version="YourClientVersion", Token="${token}"` };

    if (!useRandom && movieList.length > 0) {
        if (currentMovieIndex >= movieList.length) currentMovieIndex = 0;
        const movieId = movieList[currentMovieIndex];
        currentMovieIndex++;

        fetch(`/Users/${userId}/Items/${movieId}?Fields=Overview,RemoteTrailers,PremiereDate,RunTimeTicks,ChildCount,Genres`, { headers })
            .then(response => response.json())
            .then(checkBackdropAndLogo)
            .catch(() => startSlideChangeTimer())
            .finally(() => { isChangingSlide = false; });
    } else {
        const itemTypes = moviesSeriesBoth === 1 ? 'Movie' : (moviesSeriesBoth === 2 ? 'Series' : 'Movie,Series');
        fetch(`/Users/${userId}/Items?IncludeItemTypes=${itemTypes}&Recursive=true&Limit=1&SortBy=random&Fields=Id,Overview,RemoteTrailers,PremiereDate,RunTimeTicks,ChildCount,Genres`, { headers })
            .then(response => response.json())
            .then(data => { if (data.Items[0]) checkBackdropAndLogo(data.Items[0]); })
            .catch(() => startSlideChangeTimer())
            .finally(() => { isChangingSlide = false; });
    }
};

const checkNavigation = () => {
    const newLocation = window.top.location.href;
    if (newLocation !== currentLocation) {
        currentLocation = newLocation;
        const isHomePage = url => url.includes('/home') || url.endsWith('/web/') || url.endsWith('/web/index.html');

        if (!isHomePage(newLocation) && isHomePageActive) {
            console.log("Leaving home page, cleaning up slideshow and stopping video");
            isHomePageActive = false;
            stopBackgroundVideo();
            cleanup();
        }

        if (isHomePage(newLocation) && !isHomePageActive) {
            console.log("Returning to home page, reactivating slideshow");
            isHomePageActive = true;
            fetchRandomMovie();
        }
    }

    // Check if parent is available and if the iframe is in an embedded environment
    if (!showOnOtherPages && window.parent && window.parent !== window) {
        const isHomePage = url => url.includes('/home') || url.endsWith('/web/') || url.endsWith('/web/index.html');
        if (isHomePage(newLocation)) {
            const homeTab = window.parent.document.getElementById('homeTab');
            const isHomeTabActive = homeTab && homeTab.classList.contains('is-active');

            // Check if the user is switching tabs while on the homepage to eg. favorites or requests, if so, stop the slideshow
            if (isHomeTabActive && !isHomePageActive) {
                console.log("HomeTab is active, reactivating slideshow");
                isHomePageActive = true;
                window.parent.document.querySelector('.featurediframe').style.display = 'block';
                fetchRandomMovie();
            } else if (!isHomeTabActive && isHomePageActive) {
                console.log("Leaving HomeTab, cleaning up slideshow");
                isHomePageActive = false;
                window.parent.document.querySelector('.featurediframe').style.display = 'none';
                stopBackgroundVideo();
                cleanup();
            }
        }
    } else {
        console.error("Spotlight iframe is not in an embedded environment, has a different domain or showOnOtherPages is set to true");
    }
};

const stopBackgroundVideo = () => {
    if (player && typeof player.stopVideo === 'function') {
        player.stopVideo();
        player.destroy();
    }
    player = null;
};

setInterval(checkNavigation, 60);

document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth < 1001) useTrailers = false;
    const isHomePage = url => url.includes('/home') || url.endsWith('/web/') || url.endsWith('/web/index.html');
    if (isHomePage(window.top.location.href)) {
        isHomePageActive = true;
        console.log("Home page detected, starting slideshow");
        readCustomList().then(list => {
            if (list) { movieList = list; currentMovieIndex = 0; }
            fetchRandomMovie();
        });

        if (setMutedHover) {
            const parentBody = window.parent.document.body;
            const hoverContainer = document.getElementById('slides-container');

            // prevent error: Unmuting failed and the element was paused instead because the user didn't interact with the document before.
            const onUserInteraction = () => {
                userInteracted = true;
                console.log('User interacted with the page');
                parentBody.removeEventListener('click', onUserInteraction);
                parentBody.removeEventListener('keydown', onUserInteraction);
                hoverContainer.removeEventListener('click', onUserInteraction);
                hoverContainer.removeEventListener('keydown', onUserInteraction);
            };

            parentBody.addEventListener('click', onUserInteraction);
            parentBody.addEventListener('keydown', onUserInteraction);
            hoverContainer.addEventListener('click', onUserInteraction);
            hoverContainer.addEventListener('keydown', onUserInteraction);

            hoverContainer.addEventListener('mouseenter', () => {
                if (userInteracted && player && typeof player.unMute === 'function') {
                    player.unMute();
                    isMuted = false;
                }
            });

            hoverContainer.addEventListener('mouseleave', () => {
                if (userInteracted && player && typeof player.mute === 'function') {
                    player.mute();
                    isMuted = true;
                }
            });
        }

    }
});

window.addEventListener('unload', cleanup);
window.addEventListener('popstate', checkNavigation);