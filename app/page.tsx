export default function Home() {
  return (
    <main className="h-screen bg-black text-white flex flex-col items-center justify-center">
      
      <h1 className="text-6xl font-bold mb-4">
        FlowState.fm
      </h1>

      <p className="text-zinc-400 text-lg mb-10">
        Enter flow state instantly.
      </p>

      <button className="bg-white text-black px-6 py-3 rounded-full font-semibold hover:scale-105 transition">
        Start Vibe
      </button>

    </main>
  );
}