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
        setMessages(data);
      })
    );
  }, []);

  const getRandomStyle = () => {
    const top = Math.random() * 80 + 10; // Random top position between 10% and 90%
    const left = Math.random() * 80 + 10; // Random left position between 10% and 90%
    const rotation = Math.random() * 60 - 30; // Random rotation between -30deg and 30deg
    return {
      top: `${top}%`,
      left: `${left}%`,
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
        Porta do Banheiro
      </h1>
      <button
        onClick={handleMessageClick}
        
        className="bg-primary text-background font-primary text-xl py-2 px-4 rounded-lg mb-4"
      >
        {translate("writeMessage")}
      </button>
      <div className="min-h-48 bg-background border-4 border-primary-dark relative w-full lg:w-1/2 h-96">
        <div className="absolute w-2.5 h-2.5 bg-yellow-500 top-1/2 right-2 transform -translate-y-1/2 rounded-full font-graffiti"></div>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className="absolute font-handwriting"
            style={{
              ...getRandomStyle(),
              color: msg.fontColor,
            }}
          >
            {msg.message}
          </div>
        ))}
      </div>
    </div>
  );
}
