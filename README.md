<a id="readme-top"></a>

[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![LinkedIn][linkedin-shield]][linkedin-url]


<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

![product-screenshot]

Frontend for the [parkpulse](https://github.com/Marbjo07/ParkPulse) project.

In simple terms; serves as a maptile server with a basic frontend that combines the custom maptile service and azure maps. 

The mission of this project found at the complete git repo

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Tech Stack
* [![Kotlin][Kotlin-logo]][Kotlin-url]
* [![Spring Boot][Spring-logo]][Spring-url]
* [![Docker][Docker-logo]][Docker-url]
* [![JavaScript][JS-logo]][JS-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Getting Started

**Note:** This server is dependent on the other reposetories to function properly. Follow the instructions at [ParkPulse](https://github.com/Marbjo07/ParkPulse) to get the full ✨experience✨.
<br>
It's also required to have a valid **Azure Map** API key

### 1. Clone the repository

```shell
git clone https://github.com/Marbjo07/ParkPulse-website.git
cd ParkPulse-website
```

### 2. Define `.env` file

``` shell
AZURE_KEY_DEV=...
SKIP_USER_AUTHENTICATION=true
```

### 3. Run the dev server

```shell
docker build -f Dockerfile -t parkpulse-web .
docker run  --env-file=.env -p 8080:8080 -t parkpulse-web
```

### 4. Open the app in your browser

Visit [http://localhost:8080](http://localhost:8080) in your browser.
Then just press login, since authentication was disabled.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- FRONTEND FEATURES -->
## Frontend Features
  
- Map Filters
- Different Map Style for the base map
- Password Reset and Account Creation Flow
- Multiple Cities

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- BACKEND FEATURES -->
## Backend Features

- Integrated with [BRF search engine](https://github.com/Marbjo07/BRF-Engine) ([BRF?](https://www.geringsladan.se/in-english/#:~:text=Brf%20Geringsl%C3%A5dan%20is%20short%20for,also%20information%20specific%20to%20Sweden))
- User Authetication System using Sessions and [Access Manager](https://github.com/Marbjo07/ParkPulse-AccessManager)  
- API key retrieval
- Dockerized

<p align="right">(<a href="#readme-top">back to top</a>)</p>
  

<!-- CONTACT -->
## Contact

Marius Bjørhei - marius.bjorhei@gmail.com

Project Link: [https://github.com/Marbjo07/ParkPulse-website](https://github.com/Marbjo07/ParkPulse-website)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[forks-shield]: https://img.shields.io/github/forks/othneildrew/Best-README-Template.svg?style=for-the-badge
[forks-url]: https://github.com/othneildrew/Best-README-Template/network/members
[stars-shield]: https://img.shields.io/github/stars/othneildrew/Best-README-Template.svg?style=for-the-badge
[stars-url]: https://github.com/othneildrew/Best-README-Template/stargazers
[issues-shield]: https://img.shields.io/github/issues/othneildrew/Best-README-Template.svg?style=for-the-badge
[issues-url]: https://github.com/othneildrew/Best-README-Template/issues
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/marius-b-12861a31b
[product-screenshot]: images/screenshot.png

[Python-logo]: https://img.shields.io/badge/Python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54
[Python-url]: https://www.python.org/

[Flask-logo]: https://img.shields.io/badge/Flask-000000?style=for-the-badge&logo=flask&logoColor=white
[Flask-url]: https://flask.palletsprojects.com/

[JS-logo]: https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black
[JS-url]: https://developer.mozilla.org/en-US/docs/Web/JavaScript

[Docker-logo]: https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white
[Docker-url]: https://www.docker.com/

[Kotlin-logo]: https://img.shields.io/badge/kotlin-%230095D5.svg?style=for-the-badge&logo=kotlin&logoColor=black
[Kotlin-url]: https://kotlinlang.org/

[Spring-logo]: https://img.shields.io/badge/springboot-%236DB33F.svg?style=for-the-badge&logo=springboot&logoColor=white
[Spring-url]: https://spring.io/projects/spring-boot