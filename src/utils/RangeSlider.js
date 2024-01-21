export class RangeSlider{

    /**@type {HTMLDivElement} */
    rangeSlider

    isPointerDown = false;

    percentPosition = 0;

    /**
     * @param {HTMLDivElement} rangeSlider 
     */
    constructor(rangeSlider){
        this.rangeSlider = rangeSlider;
        this.buildRangeSlider();
        this.eventPointerMove = this.windowMove.bind(this);
        this.eventPointerUp = this.windowUp.bind(this);

        this.initEventListeners();
    }

    buildRangeSlider(){
        this.rangeSlider.innerHTML = 
        `
        <div class="main_range_slider">
            <div class="range_slider">
                <div class="rail"></div>
                <button class="thumb"></button>
            </div>
        </div>
        `;
    }

    initEventListeners(){
        this.rangeSlider.querySelector(".range_slider").addEventListener("mousedown", (e) => {
            this.isPointerDown = true;
            this.calculateAndSetPercentPosition(e);
            window.addEventListener("mousemove", this.eventPointerMove);
            window.addEventListener("mouseup", this.eventPointerUp);
        });
    }

    calculateAndSetPercentPosition(e){
        let halfWidthThumb = 10;

        let relativePositionOnSlider = e.clientX - halfWidthThumb - this.rangeSlider.querySelector(".range_slider").getBoundingClientRect().left;
        this.percentPosition = (relativePositionOnSlider / this.rangeSlider.querySelector(".range_slider").getBoundingClientRect().width) * 100;
    
        if(this.percentPosition < 0){
            this.percentPosition = 0;
        }
        else if(this.percentPosition > 100){
            this.percentPosition = 100;
        }

        this.rangeSlider.querySelector(".thumb").style.left = this.percentPosition + "%";
    }

    windowMove(e){
        if(!this.isPointerDown){
            return;
        }

        this.calculateAndSetPercentPosition(e);
    }

    windowUp(){
        this.isPointerDown = false;
        window.removeEventListener("mousemove", this.eventPointerMove);
        window.removeEventListener("mouseup", this.eventPointerUp);
        console.log(this.percentPosition);
    }
}