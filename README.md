# WorldQL

## Latest News - Winter Hackathon!
<a href="https://discord.gg/nPWVJzZFnP"><img width="1185" height="606" alt="Frame 6" src="https://github.com/user-attachments/assets/8af1ffc1-6612-49f4-88cf-4ce77878ac80" /></a>

Join our brand new Discord to register (or if you just want to join the community): [https://discord.gg/nPWVJzZFnP](https://discord.gg/nPWVJzZFnP)

## Motivation / Why build this?
Demand for environments to evaluate and train AI continues to grow. However, as environments grow in complexity, the headless scripts that power them can become difficult to debug and observe. Developers have to waste time to solve painful state management problems that have been solved before.

**Any sufficiently complex state management problem eventually becomes a game engine.** Whether you're building a game-like eval, a UI clone for RL training, or something totally unique, the WorldQL game engine is the fastest way to build robust environments that both AIs and humans can interact with!

## About

WorldQL is a game engine for building environments for RL or evaluation. It includes a graphical browser-based editor and a scaffold for connecting your environments with any model.

<img width="1574" height="853" alt="image" src="https://github.com/user-attachments/assets/98924d1a-f901-4e7c-8c35-256dce6621c7" />


## Get Started
Enter this command in your terminal to get started. This will set up the engine and our CLI tool and clone this repo:
```
curl -fsSL https://worldql.com/install.sh | sh
```
Supports macOS, Linux, and Windows via WSL.

Then, to run PortalBench
```
cd worldql/environments/portalbench
wql up
```
and the game server will start up

To run an AI to test it with, open another terminal and navigate to the harness folder and run it:
```
cd worldql/harness
deno task start
```
and an interactive interface will start allowing you to select models and run. To configure API keys, create a `.env.local` file in the `harness` folder and enter:
```
OPENROUTER_API_KEY=your-key-here-if-using-openrouter

# if using openai compatible models (including local ones)
OPENAI_BASE_URL=http://localhost/v1
OPENAI_API_KEY=something
```

We recommend using OpenRouter to test a wide variety of models.


