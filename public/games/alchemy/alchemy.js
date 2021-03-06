CanvasManager.initializeCanvas("alchemy");

function Draggable() {
}

function Dragged(xOffset, yOffset) {
    this.xOffset = xOffset;
    this.yOffset = yOffset;
}

function Fixed() {
}

class DraggableSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "Draggable"]);
        super(signature);
    }

    init() {
        PubSub.subscribe("mouseDown", this.mouseDown.bind(this));
    }

    update() {
    }

    mouseDown(topic, data) {
        var entity = data["entity"];
        if (this.relevantEntitiesMap[entity.id]) {
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            highestZ += 1;
            pc.z = highestZ;
            entity.addComponent(new Dragged(data["mouseX"] - pc.x, data["mouseY"] - pc.y));
        }
    }
}

class DraggedSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "Dragged"]);
        super(signature);
    }

    init() {
        PubSub.subscribe("mouseMove", this.mouseMove.bind(this));
        PubSub.subscribe("mouseUp", this.mouseUp.bind(this));
    }

    update() {
    }

    mouseMove(topic, data) {
        for (var key in this.relevantEntitiesMap) {
            var entity = this.relevantEntitiesMap[key];
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var dragged = entity.components[Dragged.prototype.constructor.name];

            pc.x = data["mouseX"] - dragged.xOffset;
            pc.y = data["mouseY"] - dragged.yOffset;
        }
    }

    mouseUp(topic, data) {
        var entity = data["entity"];
        if (this.relevantEntitiesMap[entity.id]) {
            var dragged = entity.components[Dragged.prototype.constructor.name];
            entity.removeComponent(dragged);

            //check for out of bounds
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var rc = entity.components[RenderComponent.prototype.constructor.name];

            if (pc.x < 0 || (pc.x + rc.width) > (canvas.getBoundingClientRect().right - 100)
                || pc.y < 0 || (pc.y + rc.height) > canvas.getBoundingClientRect().bottom) {
                EntityManager.removeEntity(entity);
            }
            else {
                PubSub.publish("checkCollision", {entity: entity});
            }
        }
    }
}

class FixedSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "Fixed"]);
        super(signature);
    }

    init() {
        PubSub.subscribe("mouseDown", this.mouseDown.bind(this));
    }

    update() {
    }

    mouseDown(topic, data) {
        var entity = data.entity;
        if (this.relevantEntitiesMap[entity.id]) {
            var pc = entity.components[PositionComponent.prototype.constructor.name];
            var rc = entity.components[RenderComponent.prototype.constructor.name];

            var newDraggableEntity = EntityManager.createEntity(entity.name);
            highestZ += 1;
            newDraggableEntity.addComponent(new PositionComponent(pc.x, pc.y, highestZ));
            newDraggableEntity.addComponent(rc);
            newDraggableEntity.addComponent(new Input());
            newDraggableEntity.addComponent(new Draggable());
            newDraggableEntity.addComponent(new Collidable(BOUNDING_BOX.RECTANGULAR, {}, false));
            newDraggableEntity.addComponent(new Dragged(data["mouseX"] - pc.x, data["mouseY"] - pc.y));
        }
    }
}

class CombiningSystem extends System {
    constructor() {
        var signature = BitUtils.getBitEquivalentForComponent(["PositionComponent", "RenderComponent", "Collidable"]);
        super(signature);
        this.rules = {
            "fire + water": "steam",
            "water + fire": "steam",
            "earth + air": "dust",
            "air + earth": "dust",
            "steam + air": "cloud",
            "air + steam": "cloud"
        }
        this.elementsFound = {};
    }

    init() {
        PubSub.subscribe("collision", this.combineElements.bind(this));
    }

    update() {
    }

    combineElements(topic, data) {
        var combined = this.rules[data.entity1.name + " + " + data.entity2.name];
        if (combined) {
            var combinedEntity = EntityManager.createEntity(combined);
            combinedEntity.addComponent(data.entity2.components[PositionComponent.prototype.constructor.name]);
            combinedEntity.addComponent(new RenderComponent(74, 74, "/common/images/"+combined+".png"));
            combinedEntity.addComponent(new Input());
            combinedEntity.addComponent(new Draggable());
            combinedEntity.addComponent(new Collidable(BOUNDING_BOX.RECTANGULAR, {}, false));
            EntityManager.removeEntity(data.entity1);
            EntityManager.removeEntity(data.entity2);

            if(!this.elementsFound[combined]){
                this.elementsFound[combined] = true;
                createFixedEntity(combined);
            }
        }
    }
}

/*--------------------------------GAME INITIALIZATION AND LOOP-----------------------------------*/
function init() {
    //define components
    ComponentManager.initialize(["Draggable", "Dragged", "Fixed"]);

    createFixedEntity("fire");
    createFixedEntity("water");
    createFixedEntity("air");
    createFixedEntity("earth");
    var rs = new RenderSystem();
    rs.addBeforeRenderCallback(renderBackground);
    SystemManager.addSystem(rs);
    SystemManager.addSystem(new InputSystem());
    SystemManager.addSystem(new FixedSystem());
    SystemManager.addSystem(new DraggableSystem());
    SystemManager.addSystem(new DraggedSystem());
    SystemManager.addSystem(new CollisionSystem());
    SystemManager.addSystem(new CombiningSystem());

    startGameLoop(30);
}

var currentOffset = 0;
function createFixedEntity(name) {
    var entity = EntityManager.createEntity(name);
    entity.addComponent(new PositionComponent(700, currentOffset * 70));
    entity.addComponent(new RenderComponent(74, 74, "/common/images/" + name + ".png"));
    entity.addComponent(new Input());
    entity.addComponent(new Fixed());
    currentOffset += 1;
}

init();
var highestZ = 0;

function renderBackground() {
    context.fillStyle = "#FFB44E";
    context.fillRect(canvas.width-100, 0, 100, canvas.clientHeight);
}