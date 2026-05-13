import { defaultData, data } from './data.js';

const container = document.getElementById('settings-container');
const btnSave = document.getElementById('btn-save');
const btnReset = document.getElementById('btn-reset');

// Objet local pour l'édition
let editingData = JSON.parse(JSON.stringify(data));

function render() {
    container.innerHTML = '';
    
    for (const [category, items] of Object.entries(editingData)) {
        const section = document.createElement('div');
        section.classList.add('bg-slate-900', 'p-3', 'rounded-xl', 'border', 'border-slate-700');
        
        const title = document.createElement('h3');
        title.classList.add('font-bold', 'text-yellow-400', 'uppercase', 'tracking-wider', 'text-sm', 'mb-3');
        title.textContent = category.replace(/([A-Z])/g, ' $1').trim();
        section.appendChild(title);

        const list = document.createElement('div');
        list.classList.add('space-y-2');
        
        let total = 0;
        
        items.forEach((item, index) => {
            let itemPerc = item.percentage !== undefined ? item.percentage : item.weight;
            total += Number(itemPerc);
            
            const row = document.createElement('div');
            row.classList.add('flex', 'justify-between', 'items-center', 'text-sm');
            
            const label = document.createElement('span');
            label.textContent = item.label;
            label.classList.add('text-slate-300');
            
            const inputWrapper = document.createElement('div');
            inputWrapper.classList.add('flex', 'items-center', 'gap-1');

            const input = document.createElement('input');
            input.type = 'number';
            input.step = '0.1';
            input.min = '0';
            input.value = itemPerc;
            input.classList.add('w-16', 'bg-slate-800', 'text-white', 'text-center', 'rounded', 'border', 'border-slate-600', 'p-1', 'focus:border-yellow-400', 'focus:outline-none');
            
            input.addEventListener('change', (e) => {
                editingData[category][index].percentage = parseFloat(e.target.value) || 0;
                render(); // Re-render to update total
            });
            
            const percentSign = document.createElement('span');
            percentSign.textContent = '%';
            percentSign.classList.add('text-slate-500', 'text-xs');

            inputWrapper.appendChild(input);
            inputWrapper.appendChild(percentSign);
            
            row.appendChild(label);
            row.appendChild(inputWrapper);
            list.appendChild(row);
        });
        
        const totalDisplay = document.createElement('div');
        totalDisplay.classList.add('text-right', 'text-xs', 'pt-2', 'mt-2', 'border-t', 'border-slate-700', 'font-bold');
        totalDisplay.textContent = `Total: ${total.toFixed(1)}%`;
        if (Math.abs(total - 100) > 0.1) {
            totalDisplay.classList.add('text-red-400');
        } else {
            totalDisplay.classList.add('text-green-400');
        }
        list.appendChild(totalDisplay);
        
        section.appendChild(list);
        container.appendChild(section);
    }
}

btnSave.addEventListener('click', () => {
    localStorage.setItem('roue-data', JSON.stringify(editingData));
    const originalText = btnSave.innerHTML;
    btnSave.innerHTML = "✅ Sauvegardé !";
    btnSave.classList.replace('bg-green-500', 'bg-emerald-600');
    setTimeout(() => {
        btnSave.innerHTML = originalText;
        btnSave.classList.replace('bg-emerald-600', 'bg-green-500');
    }, 1500);
});

btnReset.addEventListener('click', () => {
    if(confirm('Tout réinitialiser par défaut ?')) {
        localStorage.removeItem('roue-data');
        editingData = JSON.parse(JSON.stringify(defaultData));
        render();
    }
});

render();