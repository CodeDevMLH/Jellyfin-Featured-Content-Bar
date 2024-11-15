let title = 'Spotlight'; // Title of the slideshow
let listFileName = 'list.txt'; // Name of the file containing the list of movie IDs
let token = 'YOURAPIKEYHERE'; // Your Jellyfin API key
let moviesSeriesBoth = 3; // 1 for movies, 2 for series, 3 for both
let shuffleInterval = 15000; // Time in milliseconds before the next slide is shown, unless trailer is playing
let useTrailers = true; // Set to false to disable trailers
let setRandomMovie = true; // Set to false to disable random movie selection from the list
let showOnOtherPages = false; // Set to true to show the slideshow on all pages eg. favorites tab, requests tab, etc.
let showTitle = false; // Set to false to hide the title
let plotMaxLength = 550; // Maximum number of characters in the plot

let isChangingSlide = false, player = null, slideChangeTimeout = null, isHomePageActive = false;
let currentLocation = window.top.location.href;
let movieList = [], currentMovieIndex = 0;

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
    if (player) { player.destroy(); player = null; }
    clearTimeout(slideChangeTimeout);
    const container = document.getElementById('slides-container');
    if (container) container.innerHTML = '';
};

const createSlideElement = (movie, hasVideo = false) => {
    cleanup();
    const container = document.getElementById('slides-container');
    const slide = createElem('div', 'slide');
    ['backdrop', 'logo'].forEach(type => slide.appendChild(createElem('img', type, null, `/Items/${movie.Id}/Images/${type.charAt(0).toUpperCase() + type.slice(1)}${type === 'backdrop' ? '/0' : ''}`, type)));
    slide.appendChild(createElem('div', 'heading', title));

    const textContainer = createElem('div', 'text-container');
    const premiereYear = movie.PremiereDate ? new Date(movie.PremiereDate).getFullYear() : 'Unknown';
    const additionalInfo = movie.Type === 'Series' ?
        (movie.ChildCount ? `${movie.ChildCount} Season${movie.ChildCount > 1 ? 's' : ''}` : 'Unknown Seasons') :
        (movie.RunTimeTicks ? `${Math.round(movie.RunTimeTicks / 600000000)} min` : 'Unknown Runtime');

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
				<img src="https://i.imgur.com/rMvyQMt.png" alt="Rotten Tomatoes" style="width: 1.05em; height: 1.25em; font-size: 0.9em; padding-right: 0.1em; margin-left: -0.1em; vertical-align: bottom;"> 
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
    const skipButton = createElem('div', 'skip-button');
    const skipIcon = createElem('i', 'material-icons');
    skipIcon.textContent = 'chevron_right';

    backButton.appendChild(backIcon);
    skipButton.appendChild(skipIcon);

    skipIcon.onclick = (e) => { e.stopPropagation(); fetchRandomMovie(); };
    backIcon.onclick = (e) => { e.stopPropagation(); previousMovie(); };    
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
                mute: 1  // Start the video muted
            },
            events: {
                'onReady': event => {
                    event.target.playVideo();
                },
                'onStateChange': event => {
                    if (event.data === YT.PlayerState.PLAYING) {
                        // Only show when YT video is successfully playing
                        const backdrop = document.querySelector('.backdrop');
                        if (backdrop) {
                            backdrop.style.width = 'calc(100% - 23vw)';
                            backdrop.style.left = '0vw';
                        }

                        const plot = document.querySelector('.plot');
                        if (plot) plot.style.width = 'calc(100% - 36.4vw)';

                        const loremIpsum = document.querySelector('.lorem-ipsum');
                        if (loremIpsum) loremIpsum.style.paddingRight = '32.4vw';

                        const logo = document.querySelector('.logo');
                        if (logo) logo.style.left = 'calc(50% - 14.2vw)';

                        videoContainer.style.width = '34.4vw';
                    } else if (event.data === YT.PlayerState.ENDED) {
                        setTimeout(fetchRandomMovie, 100);
                    }
                },
                'onError': () => {
                    console.error(`YouTube prevented playback of '${movie.Name}'`);
                    if (player) {
                        player.destroy();
                        player = null;
                    }

                    // Reset style when a YT error occurs
                    const backdrop = document.querySelector('.backdrop');
                    if (backdrop) backdrop.style.width = '100%';

                    const plot = document.querySelector('.plot');
                    if (plot) plot.style.width = '98%';

                    const loremIpsum = document.querySelector('.lorem-ipsum');
                    if (loremIpsum) loremIpsum.style.paddingRight = '0';

                    const logo = document.querySelector('.logo');
                    if (logo) logo.style.left = '50%';

                    videoContainer.style.width = '0';

                    startSlideChangeTimer();
                }
            }
        });
    } else {
        startSlideChangeTimer();
    }


    container.innerHTML = '';
    container.appendChild(slide);
};

// Fetch the previous movie in the list
function previousMovie() {
    if (isChangingSlide) return;
    isChangingSlide = true;

    // Reset index or set to the end of the list if we are at the first element
    currentMovieIndex = (currentMovieIndex - 2 + movieList.length) % movieList.length;

    fetchNextMovie();
}

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

const readCustomList = () =>
    fetch(listFileName + '?' + new Date().getTime())
        .then(response => response.ok ? response.text() : null)
        .then(text => {
            if (!text) return null;
            const lines = text.split('\n').filter(Boolean);
            title = lines.shift() || title;
            return lines.map(line => line.trim().substring(0, 32));
        })
        .catch(() => null);

// using Fisher-Yates shuffle algorithm if list is available and setRandomMovie is set to true
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      // Generate a random index between 0 and i
      const j = Math.floor(Math.random() * (i + 1));
      // Swap elements at indices i and j
      [array[i], array[j]] = [array[j], array[i]];

      //var temp = array[i];
      //array[i] = array[j];
      //array[j] = temp;
    }
    return array;
};

//const shuffleArray = (array) => array.sort(() => Math.random() - 0.5); //better use Fisher-Yates shuffle algorithm

const fetchRandomMovie = () => {
    if (isChangingSlide) return;
    isChangingSlide = true;
    if (movieList.length === 0) {
        readCustomList().then(list => {
            if (list) {
                movieList = list;
                //// Shuffle the list if it was set by the user
                //if (setRandomMovie) {
                //    shuffleArray(movieList);
                //}
                currentMovieIndex = 0;
            }
            fetchNextMovie();
        });
    } else fetchNextMovie();
};

const fetchNextMovie = () => {
    const fetchCurrentUserId = () =>
        fetch('/Sessions', {
            headers: { 'Authorization': `MediaBrowser Client="Jellyfin Web", Device="YourDeviceName", DeviceId="YourDeviceId", Version="YourClientVersion", Token="${token}"` }
        })
            .then(response => response.json())
            .then(sessions => {
                const currentSession = sessions.find(session => session.UserId);
                return currentSession ? currentSession.UserId : null;
            })
            .catch(() => null);

    fetchCurrentUserId().then(currentUserId => {
        if (!currentUserId) {
            console.error('Could not retrieve the current user ID.');
            return;
        }

        const headers = { 'Authorization': `MediaBrowser Client="Jellyfin Web", Device="YourDeviceName", DeviceId="YourDeviceId", Version="YourClientVersion", Token="${token}"` };

        if (movieList.length > 0) {
            if (currentMovieIndex >= movieList.length) currentMovieIndex = 0;
            const movieId = movieList[currentMovieIndex];
            currentMovieIndex++;

            fetch(`/Users/${currentUserId}/Items/${movieId}?Fields=Overview,RemoteTrailers,PremiereDate,RunTimeTicks,ChildCount,Genres`, { headers })
                .then(response => response.json())
                .then(checkBackdropAndLogo)
                .catch(() => startSlideChangeTimer())
                .finally(() => { isChangingSlide = false; });
        } else {
            const itemTypes = moviesSeriesBoth === 1 ? 'Movie' : (moviesSeriesBoth === 2 ? 'Series' : 'Movie,Series');
            fetch(`/Users/${currentUserId}/Items?IncludeItemTypes=${itemTypes}&Recursive=true&Limit=1&SortBy=random&Fields=Id,Overview,RemoteTrailers,PremiereDate,RunTimeTicks,ChildCount,Genres`, { headers })
                .then(response => response.json())
                .then(data => { if (data.Items[0]) checkBackdropAndLogo(data.Items[0]); })
                .catch(() => startSlideChangeTimer())
                .finally(() => { isChangingSlide = false; });
        }
    });
};

const checkNavigation = () => {
    const newLocation = window.top.location.href;
    // Check if the user is navigating to or from the homepage
    if (newLocation !== currentLocation) {
        currentLocation = newLocation;
        const isHomePage = url => url.includes('/home') || url.endsWith('/web/') || url.endsWith('/web/index.html');
        if (isHomePage(newLocation)) {
            if (!isHomePageActive) {
                console.log("Returning to homepage, reactivating slideshow");
                isHomePageActive = true;
                cleanup();
                fetchRandomMovie();
            }
        } else if (isHomePageActive) {
            console.log("Leaving homepage, cleaning up slideshow");
            isHomePageActive = false;
            cleanup();
        }
    }

    // Check if parent is available and if the iframe is in an embedded environment
    if (!showOnOtherPages && window.parent && window.parent !== window) {
        const homeTab = window.parent.document.getElementById('homeTab');
        const isHomeTabActive = homeTab && homeTab.classList.contains('is-active');

        // Check if the user is switching tabs while on the homepage to eg. favorites or requests, if so, stop the slideshow
        if (isHomeTabActive && !isHomePageActive) {
            console.log("HomeTab is active, reactivating slideshow");
            isHomePageActive = true;
            window.parent.document.querySelector('.featurediframe').style.display = 'block';
            cleanup();
            fetchRandomMovie();
        } else if (!isHomeTabActive && isHomePageActive) {
            console.log("Leaving HomeTab, cleaning up slideshow");
            isHomePageActive = false;
            window.parent.document.querySelector('.featurediframe').style.display = 'none';
            cleanup();
        }
    } else {
        console.error("Spotlight iframe is not in an embedded environment, has a different domain or showOnOtherPages is set to true");
    }
};

setInterval(checkNavigation, 60);

document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth < 1001) useTrailers = false;
    const isHomePage = url => url.includes('/home') || url.endsWith('/web/') || url.endsWith('/web/index.html');
    if (isHomePage(window.top.location.href)) {
        isHomePageActive = true;
        readCustomList().then(list => {
            if (list) {
                movieList = list;
                // Shuffle the list if it was set by the user
                if (setRandomMovie) {
                    shuffleArray(movieList);
                    }
                currentMovieIndex = 0;
            }
            fetchRandomMovie();
        });
    }
});

window.addEventListener('unload', cleanup);
window.addEventListener('popstate', checkNavigation);