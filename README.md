# SpotlightTrailer - Featured Content Bar
Thanks to [SethBacon](https://forum.jellyfin.org/u-sethbacon) & [BobHasNoSoul](https://github.com/BobHasNoSoul) & [MakD](https://github.com/MakD) & [tedhinklater](https://github.com/tedhinklater) for their talents and work

## Main Differences in this fork
- automatically skip outros/endcards and intros on trailers using SponsorBlock API
- show the featured bar only at the main page, hide it in favorites/requests tab
- set txt list name for eg. switch between diffrent seasonal versions
- small ui style fixes
- html, css and javascript in seperate files

Testet on Jellyfin 10.10.3

## Table of Contents
- [SpotlightTrailer - Featured Content Bar](#spotlighttrailer---featured-content-bar)
  - [Main Differences in this fork](#main-differences-in-this-fork)
  - [Table of Contents](#table-of-contents)
  - [Configuration Parameters](#configuration-parameters)
  - [Installation](#installation)
  - [Uninstall](#uninstall)
  - [How to feature specific content in the bar](#how-to-feature-specific-content-in-the-bar)
- [Desktop View](#desktop-view)
- [Mobile View (Landscape / Portrait)](#mobile-view-landscape--portrait)
- [Fullscreen/MobileView on Deskzop Version](#fullscreenmobileview-on-deskzop-version)
---


![overview](https://github.com/user-attachments/assets/cb6c5a44-9121-4fbf-820c-e888efcf20aa)

## Configuration Parameters

The following configuration parameters are used to customize the behavior and appearance of the slideshow. You can adjust them at the beginning of `script.js`:

- **`title`**:  
  The title of the slideshow. Set this to a descriptive name for your slideshow. `To be done`

- **`listFileName`**:  
  The name of the file containing the list of movie or series IDs. Ensure this file exists in the correct location.

- **`token`**:  
  Your Jellyfin API key, which is required for accessing the Jellyfin API. Replace `"YOURAPIKEYHERE"` with your actual API key.

- **`moviesSeriesBoth`**:  
  Specifies the type of content to display:
  - `1` for movies only,
  - `2` for series only,
  - `3` for both.
  
  Default is `3`

- **`shuffleInterval`**:  
  Time interval (in milliseconds) between slides, unless a trailer is playing. Adjust for desired slide transition speed.

- **`useTrailers`**:  
  Enable (`true`) or disable (`false`) the display of trailers in the slideshow.

- **`setRandomMovie`**:  
  Enable (`true`) or disable (`false`) random selection of movies or series from the list. Default is `true`

- **`showOnOtherPages`**:  
  Set to `true` to show the slideshow on additional pages, such as "Favorites" or "Requests." Default is `false`.

- **`disableTrailerControls`**:  
  Set to `true` to hide trailer controls; `false` enables user control over the trailer. Default is `true`

- **`setMutedHover`**:  
  Set to `false` to disable unmuting the video on hover
  Default mute setting for trailers on hover over entire slideshow element:
  Default is `true`

- **`umuteOnHover`**:  
  Unmute video when hovered over (`true`) or keep muted (`false`).
  Default is `true`

- **`unmutedVolume`**:  
  Volume level (0–100) when unmuted.
  Default is `20`

- **`useSponsorBlock`**:  
  Enable (`true`) or disable (`false`) the use of SponsorBlock data for skipping segments (outros, intros) in trailers.
  Default is `true`

- **`skipIntro`**:  
  Enable (`true`) or disable (`false`) to skip the intro segment of the trailer.
  Default is `true`

- **`plotMaxLength`**:  
  Maximum number of characters for plot descriptions. Adjust as needed.

- **`trailerMaxLength`**:  
  Maximum duration (in milliseconds) of trailers. Set to `0` to disable trailer length limitation. Could be used instead of SponsorBlock, but SponsorBlock is recommended

- **`isMuted`**:  
  Default mute state of videos (`true` for muted, `false` for unmuted).

By adjusting these parameters, you can fine-tune the slideshow's behavior and appearance to suit your needs.


## Installation
1. Download [spotlight.html](/spotlight.html), [script.js](/script.js) and [styles.css](/styles.css)

2. Modify `script.js` like [explained above](#configuration-parameters) if necessary.

3. Go to your ```jellyfin-web``` folder and create a folder named ```ui``` and drop ```spotlight.html, script.js and styles.css``` in that folder

4. In your Jellyfin Dashboard, under ```API Keys``` create an API key for Spotlight, copy the key, and insert it as the value for the ```token``` variable in ```script.js```. You can also set the corresponding values for list name, random selection, show it only on main page, plot length, etc.

5. ```Important: Use Notepad++ for this```\
   In the jellyfin-web folder, open the file ```home-html.RANDOMSTRINGHERE.chunk.js```

6. Ctrl+F and search for ```data-backdroptype="movie,series,book">``` 

7. Paste this after the >

```js
<style> .featurediframe {width: 95vw; height: 24em; display: block; border: 0; margin: -1em auto 0;} @media (min-width: 2100px) {.featurediframe {height: 33em;}} @media (max-width: 1599px) {.featurediframe {margin-top: 1.2em;}} @media (max-width: 800px) {.featurediframe {margin-top: 0.8em; height: 25em;}} </style> <iframe class="featurediframe" src="/web/ui/spotlight.html"></iframe>
```
7. Save the file.

8. Empty your browser's cached web content (Ctrl+F5 or empty it from your browser's Cookies and Site Data settings section)

9. That's it.


## Uninstall

Simply delete Step 7's snippet added to ```home-html.chunk.js``` then refresh your browser's cache. You can, but not have to delete the ui folder.

## How to feature specific content in the bar

By default, the bar will feature content at random as long as it is available to the current user and no `list.txt` is available or if it is empty `below` line 1.

To preselect content, place a [list.txt](/list.txt) in the ```ui``` folder and paste the ID of each piece of content to be featured (IDs can be found in the address bar).

`IMPORTANT` If you use List.txt to preselect content and a User has an Age Rating limit on their account (U, PG etc) make sure you add content for them to see too, or it will just be blank (content above their Age Limit is hidden to them)

![list](https://github.com/user-attachments/assets/5f8f7924-7a9b-49c1-aefa-198cefce0f60)

# Desktop View
![fcb](https://github.com/user-attachments/assets/eb0c9ce0-b96e-4a7e-bf71-ba9a637c25a3)

# Mobile View (Landscape / Portrait)
![mobile](https://i.imgur.com/OrOzpBK.png)

# Fullscreen/MobileView on Deskzop Version

No changes here from my side for now

![Screenshot 2024-11-24 133953](https://github.com/user-attachments/assets/ededdd38-c16b-40f4-b5e8-86a03c6522c0)

Same as above except use [this version of spotlight.html](https://github.com/tedhinklater/Jellyfin-Featured-Content-Bar/blob/main/fullscreen/spotlight.html) 

insert this into home-html.RANDOMSTRINGHERE.chunk.js after ```data-backdroptype="movie,series,book">``` 

```js
<style>.featurediframe { width: 100vw; height: 100vh; display: block; border: 0px solid #000; margin: 0 auto; margin-bottom: 40px} @media (max-width:1000px) and (orientation:portrait) {.featurediframe {height: 46vh; width: 95vw;}} @media (max-width:1000px) and (orientation:landscape) {.featurediframe {height: 98vh; width: 95vw;}} @media (min-width: 2000px) { .featurediframe {height:102vh;}}</style><iframe class="featurediframe" src="/web/ui/spotlight.html"></iframe>
```

and add this CSS to the very ```end``` of your Custom CSS

```css
.layout-desktop .page.homePage.libraryPage.allLibraryPage.backdropPage.pageWithAbsoluteTabs.withTabs.mainAnimatedPage { margin-top:-4.5em;}
.layout-desktop .overflowBackdropCard, .overflowSmallBackdropCard {  width: 12.7vw !important;  padding-right: 1.85em;}
.layout-desktop .skinHeader-withBackground {background-color: transparent; backdrop-filter: blur(0px);}
.layout-desktop #homeTab .section0 .sectionTitle.sectionTitle-cards.padded-left {  display: none !important;}
.layout-desktop #homeTab .verticalSection.section1.emby-scroller-container {  position: relative;  top: -27em;  left: 73em; width: 44vw; margin-bottom: -17em;}
.layout-desktop #homeTab .verticalSection.section2.emby-scroller-container::after { content: ''; position: fixed; top: 0; left: 0; width: 100%; height: 100vw; background: black; z-index: -1;}
[dir="ltr"] #homeTab .verticalSection.section0.emby-scroller-container .emby-scrollbuttons {right: -5em; top: -2em;}
.layout-desktop #homeTab .verticalSection.section0 .cardText-first {display: none !important;}
.layout-desktop #homeTab .sections.homeSectionsContainer { margin-top: 2em;}
```
