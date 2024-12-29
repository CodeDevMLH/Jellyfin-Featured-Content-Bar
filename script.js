let title = 'Spotlight'; // Title of the slideshow TBD
let listFileName = 'list.txt'; // Name of the file containing the list of movie IDs
let token = 'YOURAPIKEYHERE'; // Your Jellyfin API key
let moviesSeriesBoth = 3; // 1 for movies, 2 for series, 3 for both
let shuffleInterval = 15000; // Time in milliseconds before the next slide is shown, unless trailer is playing
let useTrailers = true; // Set to false to disable trailers
let setRandomMovie = true; // Set to false to disable random movie selection from the list
let showOnOtherPages = false; // Set to true to show the slideshow on all pages eg. favorites tab, requests tab, etc.
//let showTitle = false; // Set to false to hide the title TBD
let disableTrailerControls = false; // Set to false to enable trailer controls
let setMutedHover = true; // Set to false to disable unmuting the video on hover
let unmutedVolume = 20; // Set the volume level when the video is unmuted
let useSponsorBlock = true; // Set to true to use SponsorBlock data to skip intro/outro segments of trailers
let skipIntro = true; // Set to true to skip the intro segment of the trailer
let plotMaxLength = 550; // Maximum number of characters in the plot
let trailerMaxLength = 0; // Default value 0; length measured in ms, set to 0 to disable, could be used instead of SponsorBlock
let startTrailerMuted = true; // Default value true; set to false to start the video unmuted



// variables
let isChangingSlide = false, player = null, slideChangeTimeout = null, isHomePageActive = false;
let currentLocation = window.top.location.href;
let movieList = [], currentMovieIndex = 0;
let previousMovies = [];
let forwardMovies = [];
let monitorOutroInterval = null; // Global interval variable to monitor the outro segment of the trailer
let isMuted = startTrailerMuted; userInteracted = false;

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

const createSlideElement = (movie, hasVideo = false) => {
    cleanup();
    isMuted = startTrailerMuted;
    const container = document.getElementById('slides-container');
    const slide = createElem('div', 'slide');

    if (movie && (!previousMovies.length || previousMovies[previousMovies.length - 1].Id !== movie.Id)) {
        previousMovies.push(movie);
    }

    if (previousMovies.length > 50) {
        previousMovies.shift();
    }
    ['backdrop', 'logo'].forEach(type => slide.appendChild(createElem('img', type, null, `/Items/${movie.Id}/Images/${type.charAt(0).toUpperCase() + type.slice(1)}${type === 'backdrop' ? '/0' : ''}`, type)));
    slide.appendChild(createElem('div', 'heading', title));

    const textContainer = createElem('div', 'text-container');
    const premiereYear = movie.PremiereDate ? new Date(movie.PremiereDate).getFullYear() : 'Unknown';

    let additionalInfo;

    if (movie.Type === 'Series') {
        additionalInfo = movie.ChildCount
            ? `${movie.ChildCount} Season${movie.ChildCount > 1 ? 's' : ''}`
            : 'Unknown Seasons';
    } else if (movie.Type === 'BoxSet') {
        additionalInfo = movie.ChildCount
            ? `${movie.ChildCount} Movie${movie.ChildCount > 1 ? 's' : ''}`
            : 'Unknown Movies';
    } else {
        additionalInfo = movie.RunTimeTicks
            ? `${Math.round(movie.RunTimeTicks / 600000000)} min`
            : 'Unknown Runtime';
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
                'onStateChange': () => {
                    if (player.getPlayerState() === YT.PlayerState.PLAYING) {
                        // Only show when YT video is successfully playing
                        const backdrop = document.querySelector('.backdrop');
                        if (backdrop) {
                            backdrop.style.width = 'calc(100% - 23vw)';
                            backdrop.style.left = '0vw';
                        }
                        const plot = document.querySelector('.plot');
                        if (plot) {
                            plot.style.left = '33vw';
                            plot.style.maxWidth = '63vw';
                        }

                        const genres = document.querySelector('.genres');
                        if (genres) {
                            genres.style.left = 'calc(50% - 17vw)';
                        }

                        const loremIpsum = document.querySelector('.lorem-ipsum');
                        if (loremIpsum) loremIpsum.style.left = 'calc(50% - 17vw)';

                        const logo = document.querySelector('.logo');
                        if (logo) logo.style.left = 'calc(50% - 17vw)';

                        videoContainer.style.width = '34.4vw';
                    } else if (player.getPlayerState() === YT.PlayerState.ENDED) {
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

const readCustomList = () =>
    fetch(listFileName + '?' + new Date().getTime())
        .then(response => response.ok ? response.text() : null)
        .then(text => {
            if (!text || !text.trim()) {
                console.warn('List.txt is empty or could not be loaded.');
                return null; // Fallback to random selection
            }
            const lines = text.split('\n').filter(Boolean);

            const firstLine = lines.shift().trim();
            const [parsedTitle, muteSetting] = firstLine.split(/\s+/);

            title = parsedTitle || title;

            // Check for mute
            // MARK: set mute
            isMuted = muteSetting === "MuteOn";

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
    const fetchCurrentUserId = () =>
        fetch('/Sessions', { headers: { 'Authorization': `MediaBrowser Client="Jellyfin Web", Device="YourDeviceName", DeviceId="YourDeviceId", Version="YourClientVersion", Token="${token}"` } })
            .then(response => response.json())
            .then(sessions => {
                const currentSession = sessions.find(session => session.UserId);
                return currentSession ? currentSession.UserId : null;
            })
            .catch(() => null);

    fetchCurrentUserId().then(currentUserId => {
        if (!currentUserId) {
            console.error('Could not retrieve the current user ID.');
            isChangingSlide = false;
            return;
        }

        const headers = { 'Authorization': `MediaBrowser Client="Jellyfin Web", Device="YourDeviceName", DeviceId="YourDeviceId", Version="YourClientVersion", Token="${token}"` };

        if (!useRandom && movieList.length > 0) {
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
    if (newLocation !== currentLocation) {
        currentLocation = newLocation;
        const isHomePage = url => url.includes('/home') || url.endsWith('/web/') || url.endsWith('/web/index.html');

        if (!isHomePage(newLocation) && isHomePageActive) {
            console.log("Leaving homepage, cleaning up slideshow and stopping video");
            isHomePageActive = false;
            stopBackgroundVideo();
            cleanup();
        }

        if (isHomePage(newLocation) && !isHomePageActive) {
            console.log("Returning to homepage, reactivating slideshow");
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
        console.log("Homepage detected, starting slideshow");
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