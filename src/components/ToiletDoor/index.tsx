import { useEffect, useState } from "react";
import { DoorMessage } from "../../entities/DoorMessage";
import { translate } from "../../languages/translator";
import ReactGA from "react-ga4";

export function ToiletDoor() {
  const [messages, setMessages] = useState<DoorMessage[]>([]);

  useEffect(() => {
    //retrieve messages
    fetch("https://retrievemessages-pzeq65kcvq-uc.a.run.app").then((response) =>
      response.json().then((data) => {
        data.forEach((msg: DoorMessage) => {
          msg.style = getRandomStyle();
        });

        setMessages(data);
      })
    );
  }, []);

  const getRandomStyle = () => {
    const top = Math.random() * 80 + 10; // Random top position between 10% and 90%
    const left = Math.random() * 80 + 10; // Random left position between 10% and 90%
    const rotation = Math.random() * 60 - 10; // Random rotation between -30deg and 30deg
    return {
    //   top: `${top}%`,
    //   left: `${left}%`,
      transform: `rotate(${rotation}deg)`,
    };
  };

  const handleMessageClick = () => {
    ReactGA.event({
      category: "Message",
      action: "Write Door Message",
      label: window.location.pathname + window.location.search,
    });
    const href = "https://buy.stripe.com/7sI5lt3YV4242Fq144";
    //open page in new window
    window.open(href, "_blank");
  };

  return (
    <div className="flex flex-col items-center py-10 px-4">
      <h1 className="text-background font-primary text-4xl mb-10">
        {translate("toiletDoor")}
      </h1>
      <button
      id="writeMessage"
        onClick={handleMessageClick}
        className="bg-primary text-background flex font-secondary text-2xl py-2 px-4 rounded-lg mb-4 items-center"
      >
        {translate("writeMessage")}
        <img src="/dora.webp" className="w-16 h-16 ml-2" />
      </button>
      <h2 className="text-background font-secondary text-2xl mb-4">
        {messages.length}/20 {translate("filled")}
      </h2>

      <div className="min-h-96 flex p-4 flex-wrap gap-8 bg-background border-8 border-secondary  w-full lg:w-1/2 h-fit rounded-lg shadow-lg select-none">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="flex font-write max-w-20 -rotate-2"
            // style={{
            //   ...msg.style,
            //   color: msg.fontColor,
            // }}
          >
            {msg.message}
          </div>
        ))}
      </div>

      {/* <div className="min-h-48 bg-background border-8 border-secondary relative w-full lg:w-1/2 h-96 rounded-lg shadow-lg select-none">
        <div className="absolute w-3 h-3 bg-yellow-500 top-1/2 right-4 transform -translate-y-1/2 rounded-full font-graffiti"></div>
        <div className="absolute w-2 h-8 bg-gray-700 top-1/2 right-2 transform -translate-y-1/2 rounded-sm"></div>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="absolute text-lg font-write"
            style={{
              ...msg.style,
              color: msg.fontColor,
            }}
          >
            {msg.message}
          </div>
        ))}
      </div> */}
    </div>
  );
}
